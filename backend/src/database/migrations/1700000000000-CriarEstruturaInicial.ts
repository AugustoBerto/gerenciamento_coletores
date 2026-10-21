import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarEstruturaInicial1700000000000 implements MigrationInterface {
  name = 'CriarEstruturaInicial1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS gestao_coletores;`);

    await queryRunner.query(`
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
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gestao_coletores.setores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(80) NOT NULL UNIQUE,
          descricao VARCHAR(255),
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gestao_coletores.coletores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patrimonio VARCHAR(7) NOT NULL UNIQUE,
          numero_serie VARCHAR(60),
          marca VARCHAR(50) NOT NULL,
          modelo VARCHAR(50) NOT NULL,
          setor_id UUID REFERENCES gestao_coletores.setores(id) ON DELETE SET NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL' CHECK (status IN ('DISPONIVEL', 'EM_USO', 'MANUTENCAO', 'INATIVO')),
          motivo_manutencao TEXT,
          numero_os VARCHAR(50),
          data_envio_manutencao TIMESTAMPTZ,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT chk_patrimonio_7_digitos CHECK (patrimonio ~ '^[0-9]{7}$')
      );
    `);

    await queryRunner.query(`
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
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_coletor_por_matricula_aberto 
      ON gestao_coletores.movimentacoes (matricula_colaborador) 
      WHERE data_retorno IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_emprestimo_aberto_por_coletor 
      ON gestao_coletores.movimentacoes (coletor_id) 
      WHERE data_retorno IS NULL;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coletores_patrimonio ON gestao_coletores.coletores (patrimonio);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coletores_status ON gestao_coletores.coletores (status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_movimentacoes_abertas ON gestao_coletores.movimentacoes (data_retorno) WHERE data_retorno IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_movimentacoes_ativas_tempo ON gestao_coletores.movimentacoes (data_saida ASC) WHERE data_retorno IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_saida ON gestao_coletores.movimentacoes (data_saida DESC);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gestao_coletores.bloqueios_colaboradores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          matricula BIGINT NOT NULL,
          motivo TEXT NOT NULL,
          operador_id UUID NOT NULL REFERENCES gestao_coletores.operadores(id) ON DELETE RESTRICT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_bloqueio_ativo_por_matricula 
      ON gestao_coletores.bloqueios_colaboradores (matricula) 
      WHERE ativo = TRUE;
    `);

    await queryRunner.query(`
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
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gestao_coletores.configuracoes (
          chave VARCHAR(50) PRIMARY KEY,
          valor TEXT NOT NULL,
          descricao VARCHAR(255),
          atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      INSERT INTO gestao_coletores.configuracoes (chave, valor, descricao)
      VALUES 
          ('SLA_ATIVO', 'false', 'Indica se o controle e monitoramento de SLA está ativo'),
          ('LIMITE_USO_MINUTOS', '480', 'Limite máximo de uso contínuo do coletor em minutos (8h)'),
          ('ALERTA_AMARELO_PERCENTUAL', '80', 'Percentual do tempo de uso para acionar alerta preventivo')
      ON CONFLICT (chave) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO gestao_coletores.setores (nome, descricao) VALUES
          ('Expedição', 'Área de conferência e despacho de mercadorias')
      ON CONFLICT (nome) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS gestao_coletores CASCADE;`);
  }
}
