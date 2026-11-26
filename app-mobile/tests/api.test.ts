import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApi, ApiError} from '../src/api.ts';
import type {Chamado} from '../src/api.ts';

const task: Chamado = {id: 1, titulo: 'Revisar relatório', descricao: '', prioridade: 'Media', status: 'Aberto', criado_em: '2026-11-26T12:00:00Z'};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status});

test('list/create/status usam base injetada e payload canônico, sem retry', async () => {
  const calls: {url: string; init?: RequestInit}[] = [];
  const api = createApi({baseUrl: 'http://localhost:8000/api/', fetch: async (url, init) => {
    calls.push({url: String(url), init});
    return json({data: init?.method === 'GET' ? [task] : task});
  }});
  assert.deepEqual(await api.list(), [task]);
  assert.deepEqual(await api.create({titulo: 'Revisar relatório', descricao: '', prioridade: 'Media'}), task);
  await api.setStatus(1, 'Concluido');
  assert.deepEqual(calls.map(c => [c.url, c.init?.method]), [
    ['http://localhost:8000/api/chamados', 'GET'], ['http://localhost:8000/api/chamados', 'POST'], ['http://localhost:8000/api/chamados/1', 'PATCH']]);
  assert.equal(calls[1].init?.headers && new Headers(calls[1].init.headers).get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(calls[2].init?.body)), {status: 'Concluido'});
});

test('422 preserva erros de campo para formulário', async () => {
  const api = createApi({baseUrl: 'http://localhost/api', fetch: async () => json({error: {message: 'Revise os campos.', fields: {titulo: 'Informe o título.'}}}, 422)});
  await assert.rejects(api.create({titulo: '', descricao: '', prioridade: 'Media'}), (e: unknown) => e instanceof ApiError && e.fields.titulo === 'Informe o título.');
});

test('falha de conexão é amigável e não repete POST', async () => {
  let calls = 0;
  const api = createApi({baseUrl: 'http://localhost/api', fetch: async () => {calls++; throw new TypeError('secret host details');}});
  await assert.rejects(api.create({titulo: 'Teste', descricao: '', prioridade: 'Alta'}), /conexão/i);
  assert.equal(calls, 1);
});

test('timeout cancela requisição e encerra mesmo se fetch ignorar abort', async () => {
  let signal: AbortSignal | null | undefined;
  const api = createApi({baseUrl: 'http://localhost/api', timeoutMs: 10, fetch: async (_url, init) => {signal = init?.signal; return new Promise(() => {});}});
  await assert.rejects(api.list(), /tempo/i);
  assert.equal(signal?.aborted, true);
});

test('resposta inválida e erro interno não vazam detalhes nem indicam sucesso', async () => {
  for (const response of [json({data: [{id: 1}]}), new Response('<secret>', {status: 500}), json({error: {message: 'SQL secret'}}, 500)]) {
    const api = createApi({baseUrl: 'http://localhost/api', fetch: async () => response});
    await assert.rejects(api.list(), (e: unknown) => e instanceof ApiError && !/secret/.test(e.message));
  }
});

test('URL ausente informa configuração sem disparar fetch', async () => {
  let called = false;
  const api = createApi({baseUrl: '', fetch: async () => {called = true; return json({data: []});}});
  await assert.rejects(api.list(), /configura/i);
  assert.equal(called, false);
});
