export type Prioridade = 'Baixa' | 'Media' | 'Alta';
export type Status = 'Aberto' | 'Concluido';
export type Chamado = {id: number; titulo: string; descricao: string; prioridade: Prioridade; status: Status; criado_em: string};
export type Cadastro = {titulo: string; descricao: string; prioridade: Prioridade};
export interface TaskApi {
  list(): Promise<Chamado[]>;
  create(input: Cadastro): Promise<Chamado>;
  setStatus(id: number, status: Status): Promise<Chamado>;
}
export class ApiError extends Error {
  readonly fields: Record<string, string>;
  readonly status: number;
  constructor(message: string, status = 0, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function isTask(value: unknown): value is Chamado {
  return object(value) && Number.isSafeInteger(value.id) && Number(value.id) > 0 &&
    typeof value.titulo === 'string' && typeof value.descricao === 'string' &&
    ['Baixa', 'Media', 'Alta'].includes(String(value.prioridade)) &&
    ['Aberto', 'Concluido'].includes(String(value.status)) && typeof value.criado_em === 'string';
}
const invalid = () => new ApiError('Não foi possível ler a resposta do servidor. Atualize a lista e tente novamente.');

export function createApi(options: {baseUrl: string; fetch?: typeof fetch; timeoutMs?: number}): TaskApi {
  const base = options.baseUrl.trim().replace(/\/+$/, '');
  const fetcher = options.fetch ?? globalThis.fetch;
  async function request(path: string, method: string, input?: unknown): Promise<unknown> {
    if (!/^https?:\/\/[^/\s]+(?:\/[^\s?#]*)?$/.test(base)) {
      throw new ApiError('Confira a configuração EXPO_PUBLIC_API_URL e reinicie o Expo com a URL da API.');
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new ApiError('O tempo de conexão esgotou. Atualize a lista antes de tentar enviar novamente.'));
        controller.abort();
      }, options.timeoutMs ?? 12000);
    });
    const operation = async () => {
      const response = await fetcher(`${base}${path}`, {
        method, signal: controller.signal,
        headers: {Accept: 'application/json', ...(input === undefined ? {} : {'Content-Type': 'application/json'})},
        ...(input === undefined ? {} : {body: JSON.stringify(input)}),
      });
      if (response.status >= 500) throw new ApiError('O servidor não conseguiu atender agora. Tente novamente mais tarde.', response.status);
      let body: unknown;
      try { body = await response.json(); } catch { throw invalid(); }
      if (!response.ok) {
        const error = object(body) && object(body.error) ? body.error : {};
        const fields: Record<string, string> = {};
        if (object(error.fields)) for (const [key, value] of Object.entries(error.fields)) if (typeof value === 'string') fields[key] = value;
        throw new ApiError(typeof error.message === 'string' ? error.message : 'Não foi possível realizar a operação.', response.status, fields);
      }
      if (!object(body) || !('data' in body)) throw invalid();
      return body.data;
    };
    try { return await Promise.race([operation(), timeout]); }
    catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Não foi possível estabelecer conexão. Confira a rede e a URL da API. Atualize a lista antes de reenviar.');
    } finally { clearTimeout(timer); }
  }
  return {
    async list() {
      const data = await request('/chamados', 'GET');
      if (!Array.isArray(data) || !data.every(isTask)) throw invalid();
      return data;
    },
    async create(input) {
      const data = await request('/chamados', 'POST', input);
      if (!isTask(data)) throw invalid();
      return data;
    },
    async setStatus(id, status) {
      const data = await request(`/chamados/${id}`, 'PATCH', {status});
      if (!isTask(data)) throw invalid();
      return data;
    },
  };
}
