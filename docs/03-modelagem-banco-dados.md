# Modelagem de Dados e Esquema Relacional (PostgreSQL)

O banco de dados relacional é o pilar de integridade e auditoria do sistema. A aplicação conecta-se via variável padronizada **`DATABASE_URL`** com pool de conexões otimizado (`max: 20`, timeouts de ociosidade e aquisição rápida). Todas as estruturas da aplicação residem no schema dedicado **`gestao_coletores`**, convivendo harmoniosamente com os schemas corporativos preexistentes (`colaborador` e `autenticacao`).

---

## 1. Conexão por Convenção (`DATABASE_URL`)

Em conformidade com a convenção do ambiente e das aplicações da VPS:
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```
*(Em produção/VPS, aponta para o host e credenciais da instância correspondente).*

---

## 2. Diagrama Entidade-Relacionamento (ERD)

```mermaid
erDiagram
    OPERADORES ||--o{ MOVIMENTACOES : "registra saida"
    OPERADORES ||--o{ MOVIMENTACOES : "registra retorno"
    COLETORES ||--o{ MOVIMENTACOES : "e movimentado"
    COLETORES ||--o{ HISTORICO_MANUTENCOES : "possui"
    OPERADORES ||--o{ HISTORICO_MANUTENCOES : "registra"
    BLOQUEIOS_COLABORADORES }o--|| OPERADORES : "bloqueado por"

    OPERADORES {
        uuid id PK
        bigint matricula UK
        varchar usuario UK
        varchar nome
        varchar cargo
        varchar papel "ADMIN | TI | OPERADOR"
        varchar senha_hash "nullable (RBAC local)"
        boolean ativo
        timestamptz criado_em
        timestamptz atualizado_em
    }

    COLETORES {
        uuid id PK
        varchar patrimonio UK "7 dígitos numéricos"
        varchar numero_serie
        varchar marca
        varchar modelo
        varchar status "DISPONIVEL | EM_USO | MANUTENCAO | INATIVO"
        text motivo_manutencao
        varchar numero_os "nullable (OS ERP)"
        timestamptz data_envio_manutencao
        timestamptz criado_em
        timestamptz atualizado_em
    }

    MOVIMENTACOES {
        uuid id PK
        uuid coletor_id FK
        bigint matricula_colaborador "FK lógica -> colaborador.colaboradores"
        varchar nome_colaborador "Snapshot histórico"
        varchar setor_colaborador "Snapshot histórico"
        uuid operador_saida_id FK
        uuid operador_retorno_id FK "nullable"
        timestamptz data_saida
        timestamptz data_retorno "nullable"
        integer minutos_uso "nullable"
        text observacao_devolucao "nullable"
        timestamptz criado_em
    }

    HISTORICO_MANUTENCOES {
        uuid id PK
        uuid coletor_id FK
        uuid operador_id FK
        text motivo_entrada
        varchar numero_os "nullable (OS ERP)"
        text solucao_saida "nullable"
        timestamptz data_entrada
        timestamptz data_conclusao "nullable"
    }

    BLOQUEIOS_COLABORADORES {
        uuid id PK
        bigint matricula UK
        text motivo
        uuid operador_id FK
        boolean ativo
        timestamptz criado_em
    }

    CONFIGURACOES {
        varchar chave PK
        text valor
        varchar descricao
        timestamptz atualizado_em
    }
```

---

## 3. Detalhamento Físico das Tabelas

### 3.1 Tabela `gestao_coletores.operadores`
Armazena a lista de operadores autorizados a acessar o sistema (whitelist de controle de acesso):
- Usuários corporativos são sincronizados pelo **Dass Auth Service** (`autenticacao.usuarios`).
- Usuários técnicos de infraestrutura (`suporte.ti`) utilizam autenticação local com `senha_hash` (bcrypt), sem poluir ou alterar os schemas corporativos.

| Coluna | Tipo | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | NÃO | `gen_random_uuid()` | Chave primária |
| `matricula` | `BIGINT` | NÃO | - | Matrícula funcional DASS (Única) |
| `usuario` | `VARCHAR(60)` | NÃO | - | Nome de usuário de login (ex: `wilker.souza` ou `suporte.ti`) |
| `nome` | `VARCHAR(120)` | NÃO | - | Nome completo |
| `cargo` | `VARCHAR(80)` | SIM | `NULL` | Cargo funcional no RH ou função de TI |
| `papel` | `VARCHAR(30)` | NÃO | `'OPERADOR'` | `'ADMIN'`, `'TI'` ou `'OPERADOR'` |
| `senha_hash` | `VARCHAR(255)` | SIM | `NULL` | Hash bcrypt para autenticação local (ex: `suporte.ti`) |
| `ativo` | `BOOLEAN` | NÃO | `TRUE` | Permite suspender ou reativar acesso ao módulo |
| `criado_em` | `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Data do cadastro |
| `atualizado_em`| `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Última modificação |

### 3.2 Tabela `gestao_coletores.coletores`
Parque físico de coletores de dados móveis.

| Coluna | Tipo | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | NÃO | `gen_random_uuid()` | Chave primária |
| `patrimonio` | `VARCHAR(7)` | NÃO | - | Patrimônio físico (exatamente 7 dígitos numéricos) |
| `numero_serie` | `VARCHAR(60)` | SIM | `NULL` | Serial do fabricante (Zebra, Honeywell, etc.) |
| `marca` | `VARCHAR(50)` | NÃO | - | Ex: "Zebra", "Honeywell" |
| `modelo` | `VARCHAR(50)` | NÃO | - | Ex: "TC21", "MC3300" |
| `status` | `VARCHAR(20)` | NÃO | `'DISPONIVEL'` | `'DISPONIVEL'`, `'EM_USO'`, `'MANUTENCAO'`, `'INATIVO'` |
| `motivo_manutencao` | `TEXT` | SIM | `NULL` | Defeito relatado em caso de manutenção |
| `numero_os` | `VARCHAR(50)` | SIM | `NULL` | Número da Ordem de Serviço aberta no ERP |
| `data_envio_manutencao` | `TIMESTAMPTZ` | SIM | `NULL` | Data de envio/abertura técnica |
| `criado_em` | `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Criação |
| `atualizado_em`| `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Modificação |

### 3.3 Tabela `gestao_coletores.movimentacoes`
Histórico transacional de custódia.
- Armazena snapshots de `nome_colaborador` e `setor_colaborador` na data da saída, preservando a fidelidade histórica do relatório mesmo se o funcionário mudar de setor ou for desligado da empresa.

| Coluna | Tipo | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | NÃO | `gen_random_uuid()` | Chave primária |
| `coletor_id` | `UUID` | NÃO | - | FK -> `coletores(id)` |
| `matricula_colaborador` | `BIGINT` | NÃO | - | Matrícula do funcionário fabril |
| `nome_colaborador` | `VARCHAR(120)`| NÃO | - | Nome no momento da saída (snapshot) |
| `setor_colaborador` | `VARCHAR(80)` | SIM | `NULL` | Setor fabril no momento da saída |
| `operador_saida_id` | `UUID` | NÃO | - | FK -> `operadores(id)` |
| `operador_retorno_id`| `UUID` | SIM | `NULL` | FK -> `operadores(id)` |
| `data_saida` | `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Momento da entrega física |
| `data_retorno` | `TIMESTAMPTZ` | SIM | `NULL` | Momento da devolução física |
| `minutos_uso` | `INTEGER` | SIM | `NULL` | Duração calculada do turno de uso |
| `observacao_devolucao` | `TEXT` | SIM | `NULL` | Observações / avarias na devolução |
| `criado_em` | `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Criação |

### 3.4 Tabela `gestao_coletores.bloqueios_colaboradores`
Bloqueios administrativos cadastrados pela equipe do almoxarifado para suspender temporariamente a retirada de coletores por determinado funcionário.

| Coluna | Tipo | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | NÃO | `gen_random_uuid()` | Chave primária |
| `matricula` | `BIGINT` | NÃO | - | Matrícula do funcionário bloqueado (Única ativa) |
| `motivo` | `TEXT` | NÃO | - | Justificativa do bloqueio |
| `operador_id` | `UUID` | NÃO | - | FK -> `operadores(id)` que aplicou o bloqueio |
| `ativo` | `BOOLEAN` | NÃO | `TRUE` | `TRUE` = bloqueio em vigor |
| `criado_em` | `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Data do bloqueio |

### 3.5 Tabela `gestao_coletores.historico_manutencoes`
Registro histórico de intervenções técnicas em coletores.

| Coluna | Tipo | Nulo? | Padrão | Descrição |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | NÃO | `gen_random_uuid()` | Chave primária |
| `coletor_id` | `UUID` | NÃO | - | FK -> `coletores(id)` |
| `operador_id` | `UUID` | NÃO | - | FK -> `operadores(id)` responsável pela entrada/baixa |
| `motivo_entrada` | `TEXT` | NÃO | - | Defeito ou sintoma técnico relatado |
| `numero_os` | `VARCHAR(50)` | SIM | `NULL` | Número da Ordem de Serviço aberta no ERP |
| `solucao_saida` | `TEXT` | SIM | `NULL` | Parecer técnico / solução realizada pela TI |
| `data_entrada` | `TIMESTAMPTZ` | NÃO | `CURRENT_TIMESTAMP` | Data de entrada técnica |
| `data_conclusao`| `TIMESTAMPTZ` | SIM | `NULL` | Data de baixa e liberação para estoque |

### 3.6 Tabela `gestao_coletores.configuracoes`
Configurações e parâmetros globais de SLA.

| Chave | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `LIMITE_USO_MINUTOS` | `INTEGER` | `480` | Limite de uso contínuo (8h de turno padrão) |
| `ALERTA_AMARELO_PERCENTUAL` | `INTEGER` | `80` | Percentual de tempo decorrido para acionar alerta preventivo amarelo |

---

## 4. Script DDL Completo (PostgreSQL)

```sql
-- 1. Criação do Schema dedicado
CREATE SCHEMA IF NOT EXISTS gestao_coletores;

-- 2. Tabela de Operadores do Sistema (Sincronizados via SSO DASS ou RBAC Local)
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

-- 3. Tabela de Coletores
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

-- 4. Tabela de Movimentações (Custódias)
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

-- 5. Índices de Integridade e Performance
-- 5.1 Trava 1:1 de Colaborador (apenas 1 custódia aberta por funcionário)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_coletor_por_matricula_aberto 
ON gestao_coletores.movimentacoes (matricula_colaborador) 
WHERE data_retorno IS NULL;

-- 5.2 Trava 1:1 de Coletor (aparelho só pode ter 1 custódia aberta)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_emprestimo_aberto_por_coletor 
ON gestao_coletores.movimentacoes (coletor_id) 
WHERE data_retorno IS NULL;

-- 5.3 Índices para buscas rápidas de bipe e listagens do Dashboard
CREATE INDEX IF NOT EXISTS idx_coletores_patrimonio ON gestao_coletores.coletores (patrimonio);
CREATE INDEX IF NOT EXISTS idx_coletores_status ON gestao_coletores.coletores (status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_abertas ON gestao_coletores.movimentacoes (data_retorno) WHERE data_retorno IS NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_ativas_tempo ON gestao_coletores.movimentacoes (data_saida ASC) WHERE data_retorno IS NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_saida ON gestao_coletores.movimentacoes (data_saida DESC);

-- 6. Tabela de Bloqueios Administrativos de Colaboradores
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

-- 7. Tabela de Histórico de Manutenções
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

-- 8. Tabela de Configurações Globais de SLA
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
```
