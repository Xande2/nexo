# Contrato congelado API Nexo v1

Base `/api`. JSON UTF-8. Objeto Chamado: `id: number`, `titulo: string`, `descricao: string` (padrão vazio), `prioridade: "Baixa"|"Media"|"Alta"`, `status: "Aberto"|"Concluido"`, `criado_em: string` ISO 8601 UTC. Sem autenticação; uso local. Banco fora de public.

- GET `/chamados[?status=Aberto|Concluido]`: 200 `{"data":Chamado[]}`, criado_em DESC, id DESC. Sem filtro retorna todos. Filtro inválido 422.
- POST `/chamados`: objeto JSON titulo, descricao opcional, prioridade opcional (Media). Título trim obrigatório, máximo 200 caracteres; descrição máximo 5000 caracteres. Tipos devem ser strings, enums exatos. 201 `{"data":Chamado}`; status inicial Aberto. Campos desconhecidos são ignorados, não persistidos.
- PATCH `/chamados/{id}`: objeto JSON `{"status":"Aberto"|"Concluido"}` explícito, idempotente. 200 `{"data":Chamado}`.
- DELETE `/chamados/{id}`: 204 sem corpo.
- OPTIONS em rotas API: 204; Allow/CORS para GET,POST,PATCH,DELETE,OPTIONS; Content-Type permitido. Origin somente da lista `NEXO_CORS_ORIGINS` separada por vírgula; padrão `http://localhost:8081,http://localhost:19006`. Origem negada não recebe Access-Control-Allow-Origin. Vary: Origin. Mobile nativo não depende de CORS.
- Erros `{"error":{"message":"texto PT-BR","fields":{}}}` (fields objeto). 400 JSON malformado/não objeto, 404 recurso/rota inexistente, 405 método não permitido com Allow, 415 media type não JSON em escritas API, 422 validação, 500 genérico sem detalhes internos. IDs inteiros positivos; ID inexistente 404.

## Interface interna PHP entre agentes

`web-php/src/bootstrap.php` retorna `Nexo\TaskRepository` configurado. Autoload local namespace Nexo. `TaskRepository::all(?string $status=null): array`, `create(array $input): array`, `setStatus(int $id,string $status): array`, `delete(int $id): void`. `Nexo\HttpException` expõe `public readonly int $status`, `public readonly array $fields`, `getMessage()`. Métodos validam entradas. `all` valida filtro. Repo usa PDO prepared statements e schema constraints.

Back-end é dono de `public/index.php` (roteador API + delega Web), `public/router.php`, `src/`, `config/`, `database/`, `tests/api*`, `.env.example` PHP. Rota não API `/` e `/excluir` executa `require __DIR__.'/../pages/dashboard.php'`; página recebe `$repository` e controla saída HTML. Assets estáticos só arquivos reais dentro de `public/assets/`; nenhuma entrega de banco, dotfiles ou paths arbitrários. Web é dono de `pages/`, `views/`, `public/assets/`, `tests/web*`. Exclusão Web POST com CSRF, confirmação explícita e PRG; sem duplicar validação/repositório.

Config: `NEXO_DB_PATH` absoluto ou padrão `web-php/database/nexo.sqlite`; `NEXO_CORS_ORIGINS`. CLI `php web-php/database/init.php` cria schema idempotente sem seed. Servidor da raiz: `php -S 127.0.0.1:8000 -t web-php/public web-php/public/router.php`.

Mobile lê `EXPO_PUBLIC_API_URL`, base com `/api`, sem IP pessoal no código. Cliente deve aceitar base injetável/fetch injetável para testes. Rede com timeout, sem repetição automática de escrita. Caminho feliz: mobile cria → Web lista → mobile conclui → Web filtra → Web exclui → mobile refresh.
