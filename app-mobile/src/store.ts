import {ApiError} from './api.ts';
import type {Cadastro, Chamado, TaskApi} from './api.ts';
export type TaskState = {
  tasks: Chamado[]; refreshing: boolean; loaded: boolean;
  writing: 'create' | number | null; form: Cadastro;
  fields: Record<string, string>; formError: string; listError: string; notice: string;
};
const emptyForm = (): Cadastro => ({titulo: '', descricao: '', prioridade: 'Media'});
const message = (error: unknown) => error instanceof ApiError ? error.message : 'Não foi possível realizar a operação. Tente novamente.';

export function createTaskStore(api: TaskApi) {
  let state: TaskState = {tasks: [], refreshing: false, loaded: false, writing: null, form: emptyForm(), fields: {}, formError: '', listError: '', notice: ''};
  const listeners = new Set<() => void>();
  let refreshId = 0;
  const update = (patch: Partial<TaskState>) => {
    state = {...state, ...patch};
    listeners.forEach(listener => listener());
  };
  // Invalida leituras iniciadas antes de qualquer escrita. Uma nova leitura
  // durante escrita também é bloqueada para não capturar um snapshot anterior.
  function beginWrite(writing: 'create' | number) {
    refreshId++;
    update({writing, refreshing: false, notice: ''});
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    dismissNotice() {
      if (state.notice) update({notice: ''});
    },
    editForm(patch: Partial<Cadastro>) {
      if (state.writing !== null) return;
      update({form: {...state.form, ...patch}, fields: {}, formError: '', notice: ''});
    },
    async refresh(): Promise<void> {
      if (state.writing !== null) return;
      const id = ++refreshId;
      update({refreshing: true, listError: '', notice: ''});
      try {
        const tasks = await api.list();
        if (id === refreshId) update({tasks, loaded: true});
      } catch (error) {
        if (id === refreshId) update({listError: `${message(error)} Os dados podem estar desatualizados.`});
      } finally {
        if (id === refreshId) update({refreshing: false});
      }
    },
    async submit(): Promise<boolean> {
      // Estado atualizado sincronamente, antes do primeiro await: protege inclusive
      // dois eventos disparados antes do próximo render do botão disabled.
      if (state.writing !== null) return false;
      const input = {...state.form, titulo: state.form.titulo.trim()};
      const fields: Record<string, string> = {};
      if (!input.titulo) fields.titulo = 'Informe o título da tarefa.';
      if ([...input.titulo].length > 200) fields.titulo = 'Use até 200 caracteres no título.';
      if ([...input.descricao].length > 5000) fields.descricao = 'Use até 5000 caracteres na descrição.';
      if (Object.keys(fields).length) {update({fields, formError: 'Revise os campos indicados.', notice: ''}); return false;}
      beginWrite('create'); update({fields: {}, formError: ''});
      try {
        const created = await api.create(input);
        update({tasks: [created, ...state.tasks.filter(t => t.id !== created.id)], form: emptyForm(), notice: 'Tarefa cadastrada.', listError: ''});
        return true;
      } catch (error) {
        update({formError: message(error), fields: error instanceof ApiError ? error.fields : {}});
        return false;
      } finally {update({writing: null});}
    },
    async toggle(id: number): Promise<boolean> {
      if (state.writing !== null) return false;
      const task = state.tasks.find(t => t.id === id);
      if (!task) return false;
      const status = task.status === 'Aberto' ? 'Concluido' : 'Aberto';
      beginWrite(id); update({listError: ''});
      try {
        const changed = await api.setStatus(id, status);
        update({tasks: state.tasks.map(t => t.id === id ? changed : t), notice: status === 'Concluido' ? 'Tarefa concluída.' : 'Tarefa reaberta.'});
        return true;
      } catch (error) {
        update({listError: `${message(error)} Atualize a lista antes de tentar novamente.`});
        return false;
      } finally {update({writing: null});}
    },
  };
}
export type TaskStore = ReturnType<typeof createTaskStore>;
