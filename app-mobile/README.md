# Nexo Mobile

React Native/Expo + TypeScript. Consome a API PHP de `docs/api.md`; nenhum banco ou serviço alternativo no app.

## Executar

Requer Node 24.3+ (ambiente verificado: 24.15.0), npm e um Expo Go compatível com SDK 58, ou development build compatível.

```sh
cd app-mobile
npm ci
cp .env.example .env
# Ajuste EXPO_PUBLIC_API_URL em .env para a API PHP, incluindo /api.
npm start
```

A configuração é pública e embutida no bundle; nunca inclua segredo em `EXPO_PUBLIC_*`. Reinicie o Expo após alterar `.env`. Não há URL de produção embutida. Sem URL, o app orienta a configuração.

- Web local: `http://localhost:8000/api`, backend CORS permitindo `http://localhost:8081` (contrato padrão).
- Android Emulator padrão: `http://10.0.2.2:8000/api` para acessar o host.
- iOS Simulator no mesmo Mac: localhost pode acessar o host.
- Celular físico: use em `.env` o IP LAN do computador servidor; ambos na mesma rede. O servidor PHP deve escutar em interface acessível pela LAN e o firewall permitir a porta. Configuração do backend pertence ao coordenador. Nenhum IP pessoal deve ser commitado.

Na Web, falhas de CORS aparecem como erro de conexão. No nativo CORS não se aplica. HTTP local em um binário nativo próprio pode exigir configuração específica de transporte de desenvolvimento no Android/iOS; não foi validado em binário/dispositivo. O app não promete acesso fora da LAN.

## Uso

A lista carrega ao abrir. Arraste para atualizar ou use Atualizar lista. Cada tarefa mostra título, prioridade e status; Concluir/Reabrir só muda a lista após confirmação da API. Nova tarefa abre formulário com título obrigatório, descrição opcional e prioridade (Média por padrão). Erros preservam os campos; voltar para a lista também mantém o rascunho na sessão atual.

Requisições têm limite de 12 segundos e abort. Não há retry automático. Após timeout/falha de escrita, a API pode ter recebido a operação: atualize a lista antes de reenviar para evitar cadastro duplicado. A trava síncrona impede toques concorrentes dentro da sessão; não equivale a uma chave de idempotência de POST no servidor. Leituras atrasadas são descartadas quando uma escrita começa. Refresh mantém os dados anteriores em caso de erro.

## Verificar

```sh
npm test
npm run typecheck
npm run doctor
npm run export:web
npm run export:native
```

Em sandbox sem acesso a `~/.expo`, use `EXPO_NO_TELEMETRY=1` antes dos comandos Expo. As ferramentas são locais; nenhuma instalação global é necessária. Testes de cliente/estado usam o runner nativo do Node 24; `fetch` e URL são injetáveis. Doubles são usados somente na fronteira HTTP/TaskApi para testar erros e concorrência.

Export é empacotamento JavaScript/assets, não compilação de APK/IPA, execução em emulador ou teste físico. Resultados e limitações reais em `../docs/reports/mobile.md`. Integração PHP/SQLite compartilhada e revisão visual/acessibilidade nativa cabem à etapa de integração.
