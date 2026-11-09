import { MigrationInterface, QueryRunner } from 'typeorm';

export class OtimizarIndicesCustodiaAberta1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_movimentacoes_aberta_colaborador
        ON gestao_coletores.movimentacoes (matricula_colaborador)
        WHERE data_retorno IS NULL;

      CREATE INDEX IF NOT EXISTS idx_movimentacoes_aberta_coletor
        ON gestao_coletores.movimentacoes (coletor_id)
        WHERE data_retorno IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS gestao_coletores.idx_movimentacoes_aberta_colaborador;
      DROP INDEX IF EXISTS gestao_coletores.idx_movimentacoes_aberta_coletor;
    `);
  }
}
