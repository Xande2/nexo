#!/usr/bin/env python3
"""HTTP integration tests: NEXO_WEB_BASE points to an isolated, initialized server.

The database is modified: use a disposable database. Run: NEXO_WEB_BASE=http://127.0.0.1:8000 python3 web-php/tests/web_http.py
"""
import http.cookiejar
import json
import os
import re
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
        self.assertEqual(headers['Allow'], 'GET, POST')
        code, headers, _ = self.request('/nova', method='PUT')
        self.assertEqual(code, 405)
        self.assertEqual(headers['Allow'], 'GET, POST')
        code, headers, _ = self.request('/', method='PUT')
        self.assertEqual(code, 405)
        self.assertEqual(headers['Allow'], 'GET')

    def test_invalid_status_is_controlled(self):
        code, _, body = self.request('/?status=invalido')
        self.assertEqual(code, 400); self.assertNotIn('Fatal error', body)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

if __name__ == '__main__':
    unittest.main()
