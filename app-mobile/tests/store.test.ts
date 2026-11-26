import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTaskStore} from '../src/store.ts';
import {ApiError} from '../src/api.ts';
import type {Chamado, TaskApi} from '../src/api.ts';
const task: Chamado = {id: 1, titulo: 'Revisar', descricao: '', prioridade: 'Media', status: 'Aberto', criado_em: '2026-11-26T12:00:00Z'};
function deferred<T>() {let resolve!: (v: T) => void; let reject!: (e: unknown) => void; const promise = new Promise<T>((a,b) => {resolve=a; reject=b;}); return {promise,resolve,reject};}
function api(overrides: Partial<TaskApi> = {}): TaskApi { return {list: async () => [task], create: async input => ({...task, ...input}), setStatus: async (_id,status) => ({...task,status}), ...overrides}; }

test('título whitespace não envia; cadastro válido trim, prioridade e reset só após sucesso', async () => {
  let calls = 0;
  const store = createTaskStore(api({create: async input => {calls++; assert.equal(input.titulo,'Preparar pauta'); assert.equal(input.prioridade,'Alta'); return {...task,...input};}}));
  store.editForm({titulo: '   ', descricao: 'Detalhes', prioridade: 'Alta'});
  assert.equal(await store.submit(), false);
  assert.equal(calls, 0);
  assert.ok(store.getSnapshot().fields.titulo);
  store.editForm({titulo: ' Preparar pauta '});
  assert.equal(await store.submit(), true);
  assert.equal(store.getSnapshot().tasks[0].titulo, 'Preparar pauta');
  assert.equal(store.getSnapshot().form.titulo, '');
  assert.equal(calls, 1);
});

test('dois toques síncronos geram um POST e estado enviando observável', async () => {
  const pending = deferred<Chamado>(); let calls = 0; let notifications = 0;
  const store = createTaskStore(api({create: async () => {calls++; return pending.promise;}}));
  const unsubscribe = store.subscribe(() => notifications++);
  store.editForm({titulo: 'Teste'});
  const first = store.submit(); const second = store.submit();
  assert.equal(store.getSnapshot().writing, 'create');
  assert.equal(calls, 1); assert.equal(await second, false);
  pending.resolve(task); assert.equal(await first, true);
  assert.ok(notifications > 0); unsubscribe();
});

test('422 preserva formulário e campos; falha nunca gera sucesso; pode reenviar manualmente', async () => {
  let calls = 0;
  const store = createTaskStore(api({create: async () => {calls++; throw new ApiError('Revise os campos.', 422, {titulo:'Título inválido'});}}));
  store.editForm({titulo: 'Teste', descricao: 'Não perder', prioridade: 'Baixa'});
  assert.equal(await store.submit(), false);
  const state = store.getSnapshot();
  assert.equal(state.form.descricao, 'Não perder'); assert.equal(state.form.prioridade,'Baixa');
  assert.equal(state.fields.titulo,'Título inválido'); assert.equal(state.notice,''); assert.equal(state.writing,null);
  await store.submit(); assert.equal(calls, 2);
});

test('refresh atrasado antes da mutação não apaga cadastro confirmado', async () => {
  const pending = deferred<Chamado[]>();
  const store = createTaskStore(api({list: () => pending.promise}));
  const refresh = store.refresh(); store.editForm({titulo:'Nova'});
  await store.submit(); pending.resolve([]); await refresh;
  assert.equal(store.getSnapshot().tasks.length, 1);
  assert.equal(store.getSnapshot().refreshing,false);
});

test('concluir/reabrir envia status explícito, bloqueia toque duplicado e ignora refresh antigo', async () => {
  const oldList = deferred<Chamado[]>(); const change = deferred<Chamado>(); let lists = 0; let writes = 0;
  const store = createTaskStore(api({list: async () => ++lists === 1 ? [task] : oldList.promise, setStatus: async (id,status) => {writes++; assert.equal(id,1); assert.equal(status,'Concluido'); return change.promise;}}));
  await store.refresh(); const refresh = store.refresh(); const first = store.toggle(1);
  assert.equal(await store.toggle(1),false); assert.equal(writes,1);
  change.resolve({...task,status:'Concluido'}); await first;
  oldList.resolve([task]); await refresh;
  assert.equal(store.getSnapshot().tasks[0].status,'Concluido');
  const reopen = createTaskStore(api({list: async () => [{...task,status:'Concluido'}], setStatus: async (_id,status) => {assert.equal(status,'Aberto');return task;}}));
  await reopen.refresh(); await reopen.toggle(1); assert.equal(reopen.getSnapshot().tasks[0].status,'Aberto');
});

test('último refresh vence; falha mantém lista e indica desatualização', async () => {
  const old = deferred<Chamado[]>(); let calls = 0;
  const store = createTaskStore(api({list: async () => {calls++; if(calls===1)return old.promise; if(calls===2)return [task]; throw new ApiError('Sem conexão');}}));
  const first = store.refresh(); await store.refresh(); old.resolve([]); await first;
  assert.equal(store.getSnapshot().tasks.length,1);
  await store.refresh(); assert.equal(store.getSnapshot().tasks.length,1);
  assert.match(store.getSnapshot().listError,/desatualizados/i);
  assert.equal(store.getSnapshot().refreshing,false);
});

test('falha PATCH mantém status confirmado e não repete escrita', async () => {
  let calls=0;
  const store = createTaskStore(api({setStatus:async () => {calls++; throw new ApiError('Sem conexão');}}));
  await store.refresh(); assert.equal(await store.toggle(1),false);
  assert.equal(store.getSnapshot().tasks[0].status,'Aberto');
  assert.ok(store.getSnapshot().listError); assert.equal(calls,1);
});

test('dismissNotice limpa apenas o aviso', async () => {
  const store = createTaskStore(api());
  await store.refresh();
  assert.equal(await store.toggle(1), true);
  assert.equal(store.getSnapshot().notice, 'Tarefa concluída.');
  const before = store.getSnapshot().tasks;
  store.dismissNotice();
  assert.equal(store.getSnapshot().notice, '');
  assert.equal(store.getSnapshot().tasks, before);
});

test('tarefa excluída em outro lugar: toggle 404 mostra erro e refresh a remove', async () => {
  let deleted = false;
  const store = createTaskStore(api({
    list: async () => deleted ? [] : [task],
    setStatus: async () => {throw new ApiError('Tarefa não encontrada.', 404);},
  }));
  await store.refresh();
  deleted = true;
  assert.equal(await store.toggle(1), false);
  assert.match(store.getSnapshot().listError, /Tarefa não encontrada/);
  await store.refresh();
  assert.equal(store.getSnapshot().tasks.some(t => t.id === 1), false);
  assert.equal(store.getSnapshot().listError, '');
});
