# Design System Nexo — baseline de implementação

Marca `nexo.`; PT-BR; frase Conectando demandas a resultados. Cor primária #172B42, secundária #304C68, fundo #F5F7FA, superfície #FFFFFF, divisória #E1E5ED, texto secundário #52647B (mais contraste que #65758B). Sucesso #21835A. Alta texto #A4372C/fundo #FCEAE5; Média #805409/#FFF3D7; Baixa e Concluído #216847/#E7F3E9; Aberto #344B64/#E8EDF3. Tokens canônicos API sem acentos, rótulos Média/Concluído com acentos.

Sistema de fonte local: Inter se instalada, system-ui na Web; fonte do sistema no RN. Espaços 4,8,12,16,24,32,48; raio 8 (campos, cards), 6 (badge). Título Web 28/34 peso 700, Mobile 28/34; corpo 15/22; secundário 13/20. Botões mínimo 44px, toques 48px no mobile. Foco Web 3px #304C68 com offset 3px, todos os controles com rótulos visíveis e estados disabled. Sem gradientes, sombra pesada, fonte/imagem remota obrigatória.

Web: sidebar marinho compacta 216px com navegação funcional; Visão geral, subtítulo, 3 indicadores globais reais, painel com tabela Tarefa/Prioridade/Status/Criada em/Ações e filtro de status. Em viewport <760 sidebar vira cabeçalho, tabela rola dentro do painel sem overflow da página. Mostrar contagem filtrada; vazio com orientação para cadastrar no app. Confirmação de exclusão explicita nome e ação, funciona com teclado; erros e sucesso via região de status. Datas com fuso informado (UTC ou local indicado).

Mobile: safe area; marca, Tarefas, subtítulo; lista de cards compactos e atualização; botão Nova tarefa; formulário com título obrigatório, descrição multiline e prioridade selecionável com texto, estados loading, envio, sucesso, erro de conexão com tentar novamente. Sem sucesso otimista; preservar formulário em erro e impedir toque repetido por ref síncrona além do disabled. Não esconder erro só em alerta efêmero. Se rede falhar durante refresh manter lista e informar que dados podem estar desatualizados.


