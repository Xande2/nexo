import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countByStatus, filterTasks, formatDate, summary} from '../src/format.ts';
import type {Chamado} from '../src/api.ts';

const base = {descricao: '', prioridade: 'Media', criado_em: '2026-11-26T12:00:00Z'} as const;
const tasks: Chamado[] = [
  {...base, id: 3, titulo: 'C', status: 'Aberto'},
  {...base, id: 2, titulo: 'B', status: 'Concluido'},
  {...base, id: 1, titulo: 'A', status: 'Aberto'},
];

test('filterTasks mantém a ordem e filtra por status', () => {
  assert.deepEqual(filterTasks(tasks, 'Todas').map(t => t.id), [3, 2, 1]);
  assert.deepEqual(filterTasks(tasks, 'Aberto').map(t => t.id), [3, 1]);
  assert.deepEqual(filterTasks(tasks, 'Concluido').map(t => t.id), [2]);
});

test('countByStatus conta total, abertas e concluídas', () => {
  assert.deepEqual(countByStatus(tasks), {total: 3, Aberto: 2, Concluido: 1});
  assert.deepEqual(countByStatus([]), {total: 0, Aberto: 0, Concluido: 0});
});

test('summary usa singular, plural e estado vazio', () => {
  assert.equal(summary({Aberto: 7, Concluido: 5}), '7 abertas · 5 concluídas');
  assert.equal(summary({Aberto: 1, Concluido: 1}), '1 aberta · 1 concluída');
  assert.equal(summary({Aberto: 0, Concluido: 0}), 'Nenhuma tarefa');
});

test('formatDate usa dd/MM/yyyy HH:mm e trata data inválida', () => {
  assert.equal(formatDate('2026-11-26T13:46:00Z', 'UTC'), '26/11/2026 13:46');
  assert.equal(formatDate('2026-01-05T03:07:00Z', 'UTC'), '05/01/2026 03:07');
  assert.equal(formatDate('x'), 'Data indisponível');
});
