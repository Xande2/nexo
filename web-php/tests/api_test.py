"""Real PHP HTTP integration; Python stdlib only. PHP_BIN/PHP_ARGS configure runtime.
Run: python3 web-php/tests/api_test.py -v
Each test copies the PHP tree and uses a private temporary SQLite database/server.
"""
import http.client
import json
import os
from pathlib import Path
import shlex
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = [os.environ.get('PHP_BIN', 'php'), *shlex.split(os.environ.get('PHP_ARGS', ''))]


class ApiTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='nexo-api-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'web-php'
        shutil.copytree(ROOT, self.root, ignore=shutil.ignore_patterns('*.sqlite*', '__pycache__'))
        (self.root / 'public').mkdir(exist_ok=True)
        self.db = Path(self.tmp.name) / 'private.sqlite'
        self.env = dict(os.environ, NEXO_DB_PATH=str(self.db), NEXO_CORS_ORIGINS='http://allowed.test')
        if (self.root / 'database/init.php').exists():
            self.init_db()
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            self.port = sock.getsockname()[1]
        self.log = tempfile.TemporaryFile()
        self.addCleanup(self.log.close)
        self.addCleanup(self.stop)
        self.start()

    def init_db(self):
        result = subprocess.run(PHP + [str(self.root / 'database/init.php')], env=self.env,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)

    def start(self):
        self.server = subprocess.Popen(PHP + ['-S', f'127.0.0.1:{self.port}', '-t',
                str(self.root / 'public'), str(self.root / 'public/router.php')],
                env=self.env, stdout=self.log, stderr=self.log)
        for _ in range(100):
            if self.server.poll() is not None:
                self.fail('PHP server exited before readiness')
            try:
                with socket.create_connection(('127.0.0.1', self.port), timeout=.1):
                    return
            except OSError:
                time.sleep(.02)
        self.fail('PHP server readiness timeout')

    def stop(self):
        if getattr(self, 'server', None) and self.server.poll() is None:
            self.server.terminate()
            self.server.wait(timeout=5)

    def request(self, method='GET', path='/api/chamados', data=None, raw=None, headers=None):
        headers = dict(headers or {})
        if data is not None:
            raw = json.dumps(data, ensure_ascii=False).encode()
            headers.setdefault('Content-Type', 'application/json; charset=UTF-8')
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            connection.request(method, path, body=raw, headers=headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def expect(self, code, *args, **kwargs):
        status, headers, body = self.request(*args, **kwargs)
        self.assertEqual(status, code, body.decode(errors='replace'))
        if code == 204:
            self.assertEqual(body, b'')
            return None, headers
        self.assertIn('application/json', headers.get('Content-Type', ''))
        payload = json.loads(body)
        if code >= 400:
            self.assertIsInstance(payload['error']['fields'], dict)
            self.assertTrue(payload['error']['message'])
            for secret in ['SQLSTATE', 'Stack trace', str(self.root), str(self.db)]:
                self.assertNotIn(secret, body.decode())
        return payload, headers

    def create(self, **kwargs):
        body, _ = self.expect(201, 'POST', data={'titulo': 'Revisar relatório', **kwargs})
        return body['data']

    def test_empty_and_create_defaults_trim_ignore_unknown(self):
        body, _ = self.expect(200)
        self.assertEqual(body, {'data': []})
        task = self.create(titulo='  Revisão  ', status='Concluido', extra='ignorar')
        self.assertEqual(task['titulo'], 'Revisão')
        self.assertEqual(task['descricao'], '')
        self.assertEqual(task['prioridade'], 'Media')
        self.assertEqual(task['status'], 'Aberto')
        self.assertIsInstance(task['id'], int)
        self.assertEqual(set(task), {'id', 'titulo', 'descricao', 'prioridade', 'status', 'criado_em'})
        self.assertRegex(task['criado_em'], r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$')

    def test_patch_explicit_idempotent_filters_and_delete(self):
        task = self.create(prioridade='Alta', descricao="Teste ' SQL; <script>")
        path = f"/api/chamados/{task['id']}"
        for _ in range(2):
            body, _ = self.expect(200, 'PATCH', path, data={'status': 'Concluido'})
            self.assertEqual(body['data'], {**task, 'status': 'Concluido'})
        body, _ = self.expect(200, path='/api/chamados?status=Aberto')
        self.assertEqual(body['data'], [])
        body, _ = self.expect(200, path='/api/chamados?status=Concluido')
        self.assertEqual(len(body['data']), 1)
        self.expect(200, 'PATCH', path, data={'status': 'Aberto'})
        self.expect(204, 'DELETE', path)
        self.expect(404, 'DELETE', path)
        self.expect(404, 'PATCH', path, data={'status': 'Aberto'})

    def test_validation_types_enums_whitespace_unicode_boundaries(self):
        invalid = [{}, {'titulo': ''}, {'titulo': ' \t\n'}, {'titulo': '\u00a0\u2003'},
                   {'titulo': 3}, {'titulo': None}, {'titulo': []}, {'titulo': {}},
                   {'titulo': True}, {'titulo': '😀' * 201}, {'descricao': 'ç' * 5001},
                   {'descricao': None}, {'descricao': 4}, {'descricao': []},
                   {'prioridade': None}, {'prioridade': []}, {'prioridade': 'Média'},
                   {'prioridade': 'alta'}, {'prioridade': ' Alta '}]
        for value in invalid:
            with self.subTest(value=str(value)[:80]):
                self.expect(422, 'POST', data={'titulo': 'OK', **value} if value else {})
        task = self.create(titulo='😀' * 200, descricao='ç' * 5000, prioridade='Baixa')
        self.assertEqual(len(task['titulo']), 200)
        self.assertEqual(len(task['descricao']), 5000)
        for value in [{}, {'status': None}, {'status': []}, {'status': True},
                      {'status': 'Concluído'}, {'status': ' Aberto '}]:
            self.expect(422, 'PATCH', f"/api/chamados/{task['id']}", data=value)
        for suffix in ['?status=', '?status=Todos', '?status[]=Aberto', '?status=aberto']:
            self.expect(422, path='/api/chamados' + suffix)

    def test_json_errors_and_media_type(self):
        for raw in [b'', b'{', b'null', b'[]', b'"abc"', b'123', b'true', b'{"titulo":"\xff"}']:
            for method, path in [('POST', '/api/chamados'), ('PATCH', '/api/chamados/1')]:
                self.expect(400, method, path, raw=raw, headers={'Content-Type': 'application/json'})
        for media in ['', 'text/plain', 'application/x-www-form-urlencoded']:
            self.expect(415, 'POST', raw=b'{"titulo":"OK"}', headers={'Content-Type': media})

    def test_missing_routes_ids_methods(self):
        for suffix in ['/0', '/-1', '/abc', '/1.2', '/99999999999999999999999999999', '/1/extra']:
            self.expect(404, 'DELETE', '/api/chamados' + suffix)
        self.expect(404, path='/api/unknown')
        for method, path, allow in [('PUT', '/api/chamados', 'POST'),
                                    ('GET', '/api/chamados/1', 'PATCH'),
                                    ('DELETE', '/api/chamados', 'GET'),
                                    ('POST', '/api/chamados/1', 'DELETE')]:
            _, headers = self.expect(405, method, path)
            self.assertIn(allow, headers['Allow'])

    def test_cors_preflight_and_errors(self):
        for path in ['/api/chamados', '/api/chamados/1']:
            _, headers = self.expect(204, 'OPTIONS', path, headers={'Origin': 'http://allowed.test',
                'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'Content-Type'})
            self.assertEqual(headers['Access-Control-Allow-Origin'], 'http://allowed.test')
            self.assertIn('Origin', headers['Vary'])
            for method in ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']:
                self.assertIn(method, headers['Access-Control-Allow-Methods'])
                self.assertIn(method, headers['Allow'])
            self.assertIn('Content-Type', headers['Access-Control-Allow-Headers'])
        _, headers = self.expect(200, headers={'Origin': 'http://denied.test'})
        self.assertNotIn('Access-Control-Allow-Origin', headers)
        _, headers = self.expect(422, path='/api/chamados?status=x', headers={'Origin': 'http://allowed.test'})
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'http://allowed.test')

    def test_order_schema_constraints_and_restart_persistence(self):
        first = self.create()
        second = self.create(titulo="'); DROP TABLE chamados; --")
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE chamados SET criado_em='2026-01-01T00:00:00Z'")
        body, _ = self.expect(200)
        self.assertEqual([t['id'] for t in body['data']], [second['id'], first['id']])
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE chamados SET criado_em='2026-01-02T00:00:00Z' WHERE id=?", (first['id'],))
            for column, value in [('titulo', ''), ('titulo', '   '), ('titulo', 'ç' * 201),
                                  ('descricao', 'a' * 5001), ('prioridade', 'Média'),
                                  ('status', 'Concluído'), ('titulo', None)]:
                with self.subTest(column=column, value=str(value)[:30]):
                    with self.assertRaises(sqlite3.IntegrityError):
                        db.execute(f'UPDATE chamados SET {column}=? WHERE id=?', (value, first['id']))
        self.stop()
        self.init_db()  # idempotence must retain rows
        self.start()
        body, _ = self.expect(200)
        self.assertEqual([t['id'] for t in body['data']], [first['id'], second['id']])

    def test_only_safe_real_assets_and_web_delegation(self):
        assets = self.root / 'public/assets'
        assets.mkdir(parents=True, exist_ok=True)
        (assets / 'test.css').write_text('body {color: red}')
        (assets / '.secret').write_text('private')
        (assets / 'danger.php').write_text('<?php echo "EXECUTED";')
        (assets / 'outside.css').symlink_to(self.db)
        (assets / 'source.css').symlink_to(assets / 'danger.php')
        for path in ['/database/nexo.sqlite', '/src/bootstrap.php', '/.env', '/index.php',
                     '/router.php', '/assets/.secret', '/assets/danger.php', '/assets/outside.css',
                     '/assets/source.css', '/assets/../index.php', '/assets/%2e%2e/index.php', '/assets/missing.css']:
            self.expect(404, path=path)
        status, _, body = self.request(path='/assets/test.css')
        self.assertEqual((status, body), (200, b'body {color: red}'))
        pages = self.root / 'pages'
        pages.mkdir(exist_ok=True)
        (pages / 'dashboard.php').write_text('<?php echo $repository instanceof \\Nexo\\TaskRepository ? "WEB" : "BAD";')
        for path in ['/', '/excluir']:
            status, _, body = self.request(path=path)
            self.assertEqual((status, body), (200, b'WEB'))

    def test_internal_failure_is_generic_and_cors_preserved(self):
        self.stop()
        self.env['NEXO_DB_PATH'] = str(Path(self.tmp.name))  # directory cannot be a database
        self.start()
        _, headers = self.expect(500, headers={'Origin': 'http://allowed.test'})
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'http://allowed.test')


if __name__ == '__main__':
    unittest.main()
