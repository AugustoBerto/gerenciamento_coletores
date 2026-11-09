import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarTabelaAutorizadosLiberacao1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gestao_coletores.autorizados_liberacao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        matricula BIGINT NOT NULL,
        nome VARCHAR(120) NOT NULL,
        setor VARCHAR(100),
        funcao VARCHAR(100),
        codbarras BIGINT,
        rfid BIGINT,
        criado_por_id UUID REFERENCES gestao_coletores.operadores(id) ON DELETE SET NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_autorizados_liberacao_matricula UNIQUE (matricula)
      );

      ALTER TABLE gestao_coletores.autorizados_liberacao
        ADD COLUMN IF NOT EXISTS codbarras BIGINT,
        ADD COLUMN IF NOT EXISTS rfid BIGINT;

      CREATE INDEX IF NOT EXISTS idx_autorizados_liberacao_matricula
        ON gestao_coletores.autorizados_liberacao (matricula);
      CREATE INDEX IF NOT EXISTS idx_autorizados_liberacao_codbarras
        ON gestao_coletores.autorizados_liberacao (codbarras);
      CREATE INDEX IF NOT EXISTS idx_autorizados_liberacao_rfid
        ON gestao_coletores.autorizados_liberacao (rfid);

      ALTER TABLE gestao_coletores.operadores
        ADD COLUMN IF NOT EXISTS codbarras BIGINT,
        ADD COLUMN IF NOT EXISTS rfid BIGINT;

      CREATE INDEX IF NOT EXISTS idx_operadores_codbarras
        ON gestao_coletores.operadores (codbarras);
      CREATE INDEX IF NOT EXISTS idx_operadores_rfid
        ON gestao_coletores.operadores (rfid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS gestao_coletores.autorizados_liberacao;
    `);
  }
}
