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
        turno SMALLINT NOT NULL CHECK (turno IN (1, 2, 3)),
        matricula_colaborador BIGINT NOT NULL,
        nome_colaborador VARCHAR(120) NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_coletor_titular_turno UNIQUE (coletor_id, turno)
      );
      CREATE INDEX IF NOT EXISTS idx_coletor_titulares_matricula
        ON gestao_coletores.coletor_titulares (matricula_colaborador);
      CREATE INDEX IF NOT EXISTS idx_coletor_titulares_coletor
        ON gestao_coletores.coletor_titulares (coletor_id);
      ALTER TABLE gestao_coletores.movimentacoes
        ADD COLUMN IF NOT EXISTS tipo_preferencia VARCHAR(25) NOT NULL DEFAULT 'LIVRE',
        ADD COLUMN IF NOT EXISTS detalhe_preferencia VARCHAR(255);
    `);
    console.log('[Database] Conectado com sucesso ao PostgreSQL via DATABASE_URL (schema: gestao_coletores).');
  }
  return AppDataSource;
};
