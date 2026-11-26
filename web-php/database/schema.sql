CREATE TABLE IF NOT EXISTS chamados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL CHECK (
        typeof(titulo) = 'text' AND length(titulo) BETWEEN 1 AND 200
        AND instr(titulo, char(0)) = 0
        AND length(trim(titulo, char(9,10,11,12,13,32,133,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288))) > 0
    ),
    descricao TEXT NOT NULL DEFAULT '' CHECK (
        typeof(descricao) = 'text' AND length(descricao) <= 5000 AND instr(descricao, char(0)) = 0
    ),
    prioridade TEXT NOT NULL DEFAULT 'Media' CHECK (prioridade IN ('Baixa', 'Media', 'Alta')),
    status TEXT NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Concluido')),
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
