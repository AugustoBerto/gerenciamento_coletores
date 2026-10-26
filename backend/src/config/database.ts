import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('FATAL: A variável de ambiente DATABASE_URL não está configurada.');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  schema: 'gestao_coletores',
  synchronize: false,
  migrationsTableName: 'schema_migrations',
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  entities: [path.join(__dirname, '../database/entities/**/*.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/**/*.{ts,js}')],
});

export const connectDatabase = async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS gestao_coletores.coletor_titulares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coletor_id UUID NOT NULL REFERENCES gestao_coletores.coletores(id) ON DELETE CASCADE,
        matricula_colaborador BIGINT NOT NULL,
        nome_colaborador VARCHAR(120) NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_coletor_titular_matricula UNIQUE (coletor_id, matricula_colaborador)
      );
      ALTER TABLE gestao_coletores.coletor_titulares
        DROP CONSTRAINT IF EXISTS uq_coletor_titular_turno,
        DROP COLUMN IF EXISTS turno;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_coletor_titular_matricula'
        ) THEN
          DELETE FROM gestao_coletores.coletor_titulares a
          USING gestao_coletores.coletor_titulares b
          WHERE a.id > b.id
            AND a.coletor_id = b.coletor_id
            AND a.matricula_colaborador = b.matricula_colaborador;
          ALTER TABLE gestao_coletores.coletor_titulares
            ADD CONSTRAINT uq_coletor_titular_matricula UNIQUE (coletor_id, matricula_colaborador);
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_coletor_titulares_matricula
        ON gestao_coletores.coletor_titulares (matricula_colaborador);
      CREATE INDEX IF NOT EXISTS idx_coletor_titulares_coletor
        ON gestao_coletores.coletor_titulares (coletor_id);
      ALTER TABLE gestao_coletores.movimentacoes
        ADD COLUMN IF NOT EXISTS tipo_preferencia VARCHAR(25) NOT NULL DEFAULT 'LIVRE',
        ADD COLUMN IF NOT EXISTS detalhe_preferencia VARCHAR(255),
        ADD COLUMN IF NOT EXISTS matricula_monitor_saida BIGINT,
        ADD COLUMN IF NOT EXISTS nome_monitor_saida VARCHAR(120),
        ADD COLUMN IF NOT EXISTS matricula_monitor_retorno BIGINT,
        ADD COLUMN IF NOT EXISTS nome_monitor_retorno VARCHAR(120);
    `);
    console.log('[Database] Conectado com sucesso ao PostgreSQL via DATABASE_URL (schema: gestao_coletores).');
  }
  return AppDataSource;
};
