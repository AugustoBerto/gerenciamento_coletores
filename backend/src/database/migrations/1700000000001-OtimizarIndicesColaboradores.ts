import { MigrationInterface, QueryRunner } from 'typeorm';

export class OtimizarIndicesColaboradores1700000000001 implements MigrationInterface {
  name = 'OtimizarIndicesColaboradores1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_colaboradores_codbarras 
      ON colaborador.colaboradores (codbarras);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_colaboradores_rfid 
      ON colaborador.colaboradores (rfid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS colaborador.idx_colaboradores_codbarras;`);
    await queryRunner.query(`DROP INDEX IF EXISTS colaborador.idx_colaboradores_rfid;`);
  }
}
