-- Schema dedicado para Gestão de Coletores Móveis
CREATE SCHEMA IF NOT EXISTS gestao_coletores;

-- Tabela de Operadores do Sistema (Sincronizados via SSO DASS ou RBAC Local)
CREATE TABLE IF NOT EXISTS gestao_coletores.operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula BIGINT NOT NULL UNIQUE,
    usuario VARCHAR(60) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    cargo VARCHAR(80),
    papel VARCHAR(30) NOT NULL DEFAULT 'OPERADOR' CHECK (papel IN ('ADMIN', 'TI', 'OPERADOR')),
    senha_hash VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Coletores
CREATE TABLE IF NOT EXISTS gestao_coletores.coletores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrimonio VARCHAR(7) NOT NULL UNIQUE,
    numero_serie VARCHAR(60),
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL' CHECK (status IN ('DISPONIVEL', 'EM_USO', 'MANUTENCAO', 'INATIVO')),
    motivo_manutencao TEXT,
    numero_os VARCHAR(50),
    data_envio_manutencao TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_patrimonio_7_digitos CHECK (patrimonio ~ '^[0-9]{7}$')
);

-- Tabela de Movimentações (Custódias)
CREATE TABLE IF NOT EXISTS gestao_coletores.movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coletor_id UUID NOT NULL REFERENCES gestao_coletores.coletores(id) ON DELETE RESTRICT,
    matricula_colaborador BIGINT NOT NULL,
    nome_colaborador VARCHAR(120) NOT NULL,
    setor_colaborador VARCHAR(80),
    operador_saida_id UUID NOT NULL REFERENCES gestao_coletores.operadores(id) ON DELETE RESTRICT,
    operador_retorno_id UUID REFERENCES gestao_coletores.operadores(id) ON DELETE RESTRICT,
    data_saida TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_retorno TIMESTAMPTZ,
    minutos_uso INTEGER,
    observacao_devolucao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_data_retorno_coerente CHECK (data_retorno IS NULL OR data_retorno >= data_saida)
);

-- Índices de Integridade e Performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_coletor_por_matricula_aberto 
ON gestao_coletores.movimentacoes (matricula_colaborador) 
WHERE data_retorno IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_emprestimo_aberto_por_coletor 
ON gestao_coletores.movimentacoes (coletor_id) 
WHERE data_retorno IS NULL;

CREATE INDEX IF NOT EXISTS idx_coletores_patrimonio ON gestao_coletores.coletores (patrimonio);
CREATE INDEX IF NOT EXISTS idx_coletores_status ON gestao_coletores.coletores (status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_abertas ON gestao_coletores.movimentacoes (data_retorno) WHERE data_retorno IS NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_ativas_tempo ON gestao_coletores.movimentacoes (data_saida ASC) WHERE data_retorno IS NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_saida ON gestao_coletores.movimentacoes (data_saida DESC);

-- Tabela de Bloqueios Administrativos de Colaboradores
CREATE TABLE IF NOT EXISTS gestao_coletores.bloqueios_colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula BIGINT NOT NULL,
    motivo TEXT NOT NULL,
    operador_id UUID NOT NULL REFERENCES gestao_coletores.operadores(id) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_bloqueio_ativo_por_matricula 
ON gestao_coletores.bloqueios_colaboradores (matricula) 
WHERE ativo = TRUE;

-- Tabela de Histórico de Manutenções
CREATE TABLE IF NOT EXISTS gestao_coletores.historico_manutencoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coletor_id UUID NOT NULL REFERENCES gestao_coletores.coletores(id) ON DELETE RESTRICT,
    operador_id UUID NOT NULL REFERENCES gestao_coletores.operadores(id) ON DELETE RESTRICT,
    motivo_entrada TEXT NOT NULL,
    numero_os VARCHAR(50),
    solucao_saida TEXT,
    data_entrada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMPTZ
);

-- Tabela de Configurações Globais de SLA
CREATE TABLE IF NOT EXISTS gestao_coletores.configuracoes (
    chave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL,
    descricao VARCHAR(255),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de valores padrão
INSERT INTO gestao_coletores.configuracoes (chave, valor, descricao)
VALUES 
    ('LIMITE_USO_MINUTOS', '480', 'Limite máximo de uso contínuo do coletor em minutos (8h)'),
    ('ALERTA_AMARELO_PERCENTUAL', '80', 'Percentual do tempo de uso para acionar alerta preventivo')
ON CONFLICT (chave) DO NOTHING;
