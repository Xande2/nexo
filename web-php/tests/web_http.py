#!/usr/bin/env python3
"""HTTP integration tests: NEXO_WEB_BASE points to an isolated, initialized server.

The database is modified: use a disposable database. Run: NEXO_WEB_BASE=http://127.0.0.1:8000 python3 web-php/tests/web_http.py
"""
import email
import html.parser
import http.cookiejar
import json
import os
import re
import socket
import unittest
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get('NEXO_WEB_BASE', 'http://127.0.0.1:8000').rstrip('/')

class WebHTTP(unittest.TestCase):
    def setUp(self):
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), NoRedirect())
        self.ids = []

    def request(self, path, data=None, method=None, json_body=False):
        headers = {}
        if data is not None:
            if json_body:
                data = json.dumps(data).encode(); headers['Content-Type'] = 'application/json'
            else:
                data = urllib.parse.urlencode(data).encode()
        req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
        try:
            response = self.client.open(req)
        except urllib.error.HTTPError as error:
            response = error
        return response.status, response.headers, response.read().decode()

    def create(self, title, status='Aberto', description='', priority='Media'):
        code, _, body = self.request('/api/chamados', {'titulo': title, 'prioridade': priority, 'descricao': description}, json_body=True)
        self.assertEqual(code, 201)
        item = json.loads(body)['data']; self.ids.append(item['id'])
        if status != 'Aberto':
            code, _, _ = self.request('/api/chamados/' + str(item['id']), {'status': status}, 'PATCH', True)
            self.assertEqual(code, 200)
        return item['id']

    def tearDown(self):
        for item in self.ids:
            self.request('/api/chamados/' + str(item), method='DELETE')

    def test_table_filter_global_metrics_and_escape(self):
        title = '<script>alert("nexo")</script>'
        self.create(title); self.create('Tarefa concluída teste', 'Concluido')
        code, _, body = self.request('/?status=Concluido')
        self.assertEqual(code, 200); self.assertIn('Tarefa concluída teste', body)
        self.assertNotIn(title, body); self.assertNotIn('&lt;script&gt;', body)
        code, _, body = self.request('/?status=Aberto')
        self.assertEqual(code, 200); self.assertIn('&lt;script&gt;', body)
        self.assertNotIn(title, body); self.assertNotIn('Tarefa concluída teste', body)
        self.assertRegex(body, r'Total de tarefas[\s\S]*?\b2\b')
        self.assertRegex(body, r'Concluídas[\s\S]*?\b1\b')

    def test_confirmation_csrf_and_prg(self):
        item = self.create('Excluir com confirmação')
        code, _, body = self.request('/excluir?id=%s&status=Aberto' % item)
        self.assertEqual(code, 200); self.assertIn('Excluir com confirmação', body)
        token = re.search(r'name="csrf" value="([^"]+)"', body)
        self.assertIsNotNone(token)
        code, _, _ = self.request('/excluir', {'id': item, 'status': 'Aberto', 'csrf': 'invalid'})
        self.assertEqual(code, 403)
        code, _, body = self.request('/?status=Aberto'); self.assertIn('Excluir com confirmação', body)
        code, headers, _ = self.request('/excluir', {'id': item, 'status': 'Aberto', 'csrf': token.group(1)})
        self.assertEqual(code, 303); self.assertEqual(headers['Location'], '/?status=Aberto')
        code, _, body = self.request('/?status=Aberto'); self.assertNotIn('Excluir com confirmação', body)

    def test_zero_description_is_displayed(self):
        self.create('Descrição numérica', description='0')
        code, _, body = self.request('/')
        self.assertEqual(code, 200)
        row = re.search(r'<tr[^>]*>(?:(?!</tr>)[\s\S])*Descrição numérica(?:(?!</tr>)[\s\S])*</tr>', body)
        self.assertIsNotNone(row)
        self.assertRegex(row.group(0), r'>0<')

    def test_search_and_priority_filters(self):
        self.create('Buscável zebra única')
        self.create('Prioridade alta teste', priority='Alta')
        code, _, body = self.request('/?q=' + urllib.parse.quote('zebra única'))
        self.assertEqual(code, 200); self.assertIn('Buscável zebra única', body); self.assertNotIn('Prioridade alta teste', body)
        code, _, body = self.request('/?prioridade=Alta')
        self.assertEqual(code, 200); self.assertIn('Prioridade alta teste', body); self.assertNotIn('Buscável zebra única', body)

    def test_status_toggle_csrf_and_filters(self):
        item = self.create('Alternar status zebra')
        code, _, body = self.request('/')
        token = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
        code, _, _ = self.request('/status', {'id': item, 'novo_status': 'Concluido', 'csrf': 'invalid'})
        self.assertEqual(code, 403)
        code, _, body = self.request('/?status=Aberto'); self.assertIn('Alternar status zebra', body)
        code, headers, _ = self.request('/status', {'id': item, 'novo_status': 'Concluido', 'status': 'Aberto', 'q': 'zebra', 'csrf': token})
        self.assertEqual(code, 303); self.assertEqual(headers['Location'], '/?status=Aberto&q=zebra')
        code, _, body = self.request('/?status=Concluido')
        self.assertIn('Alternar status zebra', body); self.assertIn('Tarefa concluída.', body)
        token = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
        code, _, _ = self.request('/status', {'id': item, 'novo_status': 'Pendente', 'csrf': token})
        self.assertEqual(code, 422)
        code, _, _ = self.request('/status', {'id': 999999, 'novo_status': 'Aberto', 'csrf': token})
        self.assertEqual(code, 404)

    def find_api_id(self, title):
        code, _, body = self.request('/api/chamados')
        matches = [item['id'] for item in json.loads(body)['data'] if item['titulo'] == title]
        self.ids.extend(matches)
        return matches

    def test_create_from_web(self):
        code, _, body = self.request('/nova')
        self.assertEqual(code, 200); self.assertIn('name="titulo"', body)
        token = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
        code, headers, _ = self.request('/nova', {'titulo': ' Preparar pauta web ', 'descricao': 'Itens da semana', 'prioridade': 'Alta', 'csrf': token})
        self.assertEqual(code, 303); self.assertEqual(headers['Location'], '/')
        self.assertEqual(len(self.find_api_id('Preparar pauta web')), 1)
        code, _, body = self.request('/')
        self.assertIn('Preparar pauta web', body); self.assertIn('Tarefa cadastrada.', body)
        row = re.search(r'<tr[^>]*>(?:(?!</tr>)[\s\S])*Preparar pauta web(?:(?!</tr>)[\s\S])*</tr>', body).group(0)
        self.assertIn('Aberto', row); self.assertIn('Alta', row)

    def test_create_validation_preserves_escaped_values(self):
        code, _, body = self.request('/nova')
        token = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
        code, _, body = self.request('/nova', {'titulo': '   ', 'descricao': '<b>x</b>', 'prioridade': 'Baixa', 'csrf': token})
        self.assertEqual(code, 422)
        self.assertIn('&lt;b&gt;x&lt;/b&gt;', body); self.assertNotIn('<b>x</b>', body)
        self.assertIn('O título deve conter de 1 a 200 caracteres.', body)
        self.assertIn('aria-invalid="true"', body)
        self.assertRegex(body, r'value="Baixa"[^>]*checked')

    def post_invalid_task(self, **fields):
        _, _, body = self.request('/nova')
        token = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
        code, _, body = self.request('/nova', dict(fields, csrf=token))
        self.assertEqual(code, 422)
        form = FormFields(); form.feed(body)
        return body, form

    def assert_field_errors(self, form, focused, invalid):
        self.assertEqual(form.keys('autofocus'), [focused])
        self.assertEqual(form.keys('aria-invalid'), invalid)
        for key in invalid:
            self.assertEqual(form.fields[key]['aria-invalid'], 'true')
            self.assertEqual(form.fields[key]['aria-describedby'], key.split(':')[0] + '-erro')

    # Empty priority: other unknown values are rejected earlier (400) by the panel filter validation.
    def test_invalid_priority_marks_and_focuses_radio_group(self):
        body, form = self.post_invalid_task(titulo='Título "válido"', descricao='<b>x</b>', prioridade='')
        self.assert_field_errors(form, RADIOS[0], RADIOS)
        self.assertIn('id="prioridade-erro"', body)
        self.assertIn('Selecione Baixa, Media ou Alta.', body)
        self.assertEqual(form.fields['titulo']['value'], 'Título "válido"')
        self.assertIn('&lt;b&gt;x&lt;/b&gt;</textarea>', body)
        self.assertNotIn('<b>x</b>', body)

    def test_invalid_description_with_valid_title_focuses_description(self):
        description = '<b>' + 'x' * 5000
        body, form = self.post_invalid_task(titulo='Título válido', descricao=description, prioridade='Alta')
        self.assert_field_errors(form, 'descricao', ['descricao'])
        self.assertIn('id="descricao-erro"', body)
        self.assertIn('A descrição deve ser texto com até 5000 caracteres.', body)
        self.assertEqual(form.fields['titulo']['value'], 'Título válido')
        self.assertIn('&lt;b&gt;' + 'x' * 5000 + '</textarea>', body)
        self.assertIn('checked', form.fields['prioridade:Alta'])

    def test_multiple_invalid_fields_focus_first_in_form_order(self):
        body, form = self.post_invalid_task(titulo='   ', descricao='x' * 5001, prioridade='')
        self.assert_field_errors(form, 'titulo', ['titulo', 'descricao'] + RADIOS)
        for field in ('titulo', 'descricao', 'prioridade'):
            self.assertIn('id="%s-erro"' % field, body)
        _, form = self.post_invalid_task(titulo='Título válido', descricao='x' * 5001, prioridade='')
        self.assert_field_errors(form, 'descricao', ['descricao'] + RADIOS)

    def test_create_requires_csrf(self):
        code, _, _ = self.request('/nova', {'titulo': 'Sem token válido', 'prioridade': 'Media', 'csrf': 'invalid'})
        self.assertEqual(code, 403)
        self.assertEqual(self.find_api_id('Sem token válido'), [])

    def test_csrf_token_survives_posts_for_multiple_tabs(self):
        first = self.create('Primeira aba')
        second = self.create('Segunda aba')
        code, _, body = self.request('/')
        token = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
        for item in (first, second):
            code, _, _ = self.request('/status', {'id': item, 'novo_status': 'Concluido', 'csrf': token})
            self.assertEqual(code, 303)

    def test_delete_confirmation_for_missing_task_is_404(self):
        code, _, body = self.request('/excluir?id=999999&status=Aberto')
        self.assertEqual(code, 404)
        self.assertIn('Tarefa não encontrada.', body); self.assertIn('<title>Página não encontrada | Nexo</title>', body)
        self.assertNotIn('Fatal error', body)

    def test_tampered_filters_are_controlled(self):
        for query in ('/?q[]=x', '/?prioridade=Urgente', '/?q=' + 'a' * 101, '/?status[]=Aberto'):
            code, _, body = self.request(query)
            self.assertEqual(code, 400, query); self.assertNotIn('Fatal error', body); self.assertIn('Filtro inválido', body)

    def test_invalid_utf8_search_is_rejected_without_listing(self):
        self.create('Não pode vazar na busca inválida')
        # Lone byte, mixed with valid text, truncated sequence, overlong encoding and UTF-16 surrogate.
        for query in ('%FF', 'vazar%FF', '%C3', '%C0%AF', '%ED%A0%80'):
            with self.subTest(q=query):
                code, _, body = self.request('/?q=' + query)
                self.assertEqual(code, 400)
                self.assertIn('Filtro inválido', body)
                self.assertNotIn('Não pode vazar na busca inválida', body)

    def test_invalid_utf8_filter_blocks_status_change(self):
        item = self.create('Intocada por filtro inválido')
        _, _, body = self.request('/')
        token = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
        code, _, body = self.request('/status', {'id': item, 'novo_status': 'Concluido', 'q': b'\xff', 'csrf': token})
        self.assertEqual(code, 400); self.assertIn('Filtro inválido', body)
        _, _, body = self.request('/?status=Aberto')
        self.assertIn('Intocada por filtro inválido', body)

    def test_accented_search_trims_unicode_whitespace(self):
        self.create('Revisão de ação número 7')
        self.create('Outra pendência')
        # NBSP and ideographic space around the term must be removed; inner spaces stay.
        for term in ('ação número', '\u00a0\u3000 ação número \t\u2003'):
            with self.subTest(q=term):
                code, _, body = self.request('/?q=' + urllib.parse.quote(term))
                self.assertEqual(code, 200)
                self.assertIn('Revisão de ação número 7', body)
                self.assertNotIn('Outra pendência', body)
                self.assertIn('value="ação número"', body)

    def test_search_length_limit_counts_characters_after_trim(self):
        # Multibyte characters: 100 of them exceed 100 bytes but are still within the limit.
        for char in ('a', 'é', '🙂'):
            title = 'Limite ' + char * 100
            self.create(title)
            for term in (char * 100, '\u00a0' + char * 100 + '  '):
                with self.subTest(char=char, accepted=len(term)):
                    code, _, body = self.request('/?q=' + urllib.parse.quote(term))
                    self.assertEqual(code, 200)
                    self.assertIn(title, body)
            with self.subTest(char=char, rejected=101):
                code, _, body = self.request('/?q=' + urllib.parse.quote(char * 101))
                self.assertEqual(code, 400)
                self.assertIn('Filtro inválido', body)
                self.assertNotIn(title, body)

    def test_method_not_allowed_advertises_route_methods(self):
        code, headers, _ = self.request('/excluir', method='PUT')
        self.assertEqual(code, 405)
        self.assertEqual(headers['Allow'], 'GET, HEAD, POST')
        code, headers, _ = self.request('/nova', method='PUT')
        self.assertEqual(code, 405)
        self.assertEqual(headers['Allow'], 'GET, HEAD, POST')
        code, headers, _ = self.request('/', method='PUT')
        self.assertEqual(code, 405)
        self.assertEqual(headers['Allow'], 'GET, HEAD')

    def raw_head(self, path):
        """HEAD over a raw socket: http.client never reads a HEAD body, so it would hide a leaked one."""
        url = urllib.parse.urlsplit(BASE)
        with socket.create_connection((url.hostname, url.port or 80), timeout=5) as sock:
            sock.sendall(('HEAD %s HTTP/1.0\r\nHost: %s\r\n\r\n' % (path, url.netloc)).encode())
            data = b''
            while chunk := sock.recv(65536):
                data += chunk
        head, _, body = data.partition(b'\r\n\r\n')
        lines = head.decode('iso-8859-1').split('\r\n')
        headers = email.message_from_string('\r\n'.join(lines[1:]) + '\r\n\r\n')
        return int(lines[0].split()[1]), headers, body

    def test_head_mirrors_get_on_read_routes(self):
        item = self.create('Alvo do HEAD')
        cases = [('/', 200), ('/?status=Aberto&prioridade=Media&q=alvo', 200), ('/nova', 200),
                 ('/excluir?id=%s' % item, 200), ('/excluir?id=%s&status=Aberto' % item, 200),
                 ('/excluir?id=999999', 404), ('/excluir?id=0', 404), ('/excluir?id=abc', 404), ('/excluir', 404),
                 ('/?status=invalido', 400), ('/?prioridade=Urgente', 400), ('/?q[]=x', 400),
                 ('/?q=%FF', 400), ('/?q=' + 'a' * 101, 400), ('/nova?status=x', 400),
                 ('/excluir?id=%s&prioridade=Urgente' % item, 400)]
        for path, expected in cases:
            with self.subTest(path=path):
                get_code, get_headers, get_body = self.request(path)
                head_code, head_headers, head_body = self.raw_head(path)
                self.assertEqual(get_code, expected)
                self.assertEqual(head_code, get_code)
                self.assertEqual(head_body, b'')
                self.assertTrue(get_body)
                for name in ('Content-Type', 'Allow', 'Location', 'Cache-Control', 'X-Content-Type-Options'):
                    self.assertEqual(head_headers[name], get_headers[name], name)
        self.assertIn('Alvo do HEAD', self.request('/?status=Aberto')[2])

    def test_head_keeps_write_and_api_method_rules(self):
        for path, allow in (('/status', 'POST'), ('/api/chamados', 'GET,POST,OPTIONS'), ('/api/chamados/1', 'PATCH,DELETE,OPTIONS')):
            with self.subTest(path=path):
                code, headers, body = self.raw_head(path)
                self.assertEqual(code, 405)
                self.assertEqual(headers['Allow'], allow)
                self.assertEqual(body, b'')

    def test_invalid_status_is_controlled(self):
        code, _, body = self.request('/?status=invalido')
        self.assertEqual(code, 400); self.assertNotIn('Fatal error', body)

RADIOS = ['prioridade:Baixa', 'prioridade:Media', 'prioridade:Alta']

class FormFields(html.parser.HTMLParser):
    """Collects input/textarea attributes, keyed by name (radios as name:value)."""
    def __init__(self):
        super().__init__()
        self.fields = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('input', 'textarea') and attrs.get('type') != 'hidden':
            key = attrs['name'] + (':' + attrs['value'] if attrs.get('type') == 'radio' else '')
            self.fields[key] = attrs

    def keys(self, attribute):
        return [key for key, attrs in self.fields.items() if attribute in attrs]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

if __name__ == '__main__':
    unittest.main()
