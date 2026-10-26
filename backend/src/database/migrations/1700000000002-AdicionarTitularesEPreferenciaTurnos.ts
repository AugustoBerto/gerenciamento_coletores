import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarTitularesEPreferenciaTurnos1700000000002 implements MigrationInterface {
  name = 'AdicionarTitularesEPreferenciaTurnos1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gestao_coletores.coletor_titulares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coletor_id UUID NOT NULL REFERENCES gestao_coletores.coletores(id) ON DELETE CASCADE,
        turno SMALLINT NOT NULL CHECK (turno IN (1, 2, 3)),
        matricula_colaborador BIGINT NOT NULL,
        nome_colaborador VARCHAR(120) NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_coletor_titular_turno UNIQUE (coletor_id, turno)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coletor_titulares_matricula
      ON gestao_coletores.coletor_titulares (matricula_colaborador);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coletor_titulares_coletor
      ON gestao_coletores.coletor_titulares (coletor_id);
    `);

    await queryRunner.query(`
      ALTER TABLE gestao_coletores.movimentacoes
      ADD COLUMN IF NOT EXISTS tipo_preferencia VARCHAR(25) NOT NULL DEFAULT 'LIVRE';
    `);

    await queryRunner.query(`
      ALTER TABLE gestao_coletores.movimentacoes
      ADD COLUMN IF NOT EXISTS detalhe_preferencia VARCHAR(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE gestao_coletores.movimentacoes
      DROP COLUMN IF EXISTS detalhe_preferencia,
      DROP COLUMN IF EXISTS tipo_preferencia;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS gestao_coletores.coletor_titulares;
    `);
  }
}
