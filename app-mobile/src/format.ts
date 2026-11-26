// Funções puras de apresentação: sem React, testáveis com node:test.
import type {Chamado} from './api.ts';

export type StatusFilter = 'Todas' | 'Aberto' | 'Concluido';
export type StatusCounts = {total: number; Aberto: number; Concluido: number};

export function filterTasks(tasks: Chamado[], filter: StatusFilter): Chamado[] {
  return filter === 'Todas' ? tasks : tasks.filter(task => task.status === filter);
}

export function countByStatus(tasks: Chamado[]): StatusCounts {
  const counts: StatusCounts = {total: tasks.length, Aberto: 0, Concluido: 0};
  for (const task of tasks) counts[task.status]++;
  return counts;
}

export function summary(counts: {Aberto: number; Concluido: number}): string {
  if (counts.Aberto + counts.Concluido === 0) return 'Nenhuma tarefa';
  const open = `${counts.Aberto} ${counts.Aberto === 1 ? 'aberta' : 'abertas'}`;
  const done = `${counts.Concluido} ${counts.Concluido === 1 ? 'concluída' : 'concluídas'}`;
  return `${open} · ${done}`;
}

/** dd/MM/yyyy HH:mm no fuso informado (padrão: fuso do aparelho). */
export function formatDate(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}
