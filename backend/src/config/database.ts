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
    console.log('[Database] Conectado com sucesso ao PostgreSQL via DATABASE_URL (schema: gestao_coletores).');
    await AppDataSource.runMigrations();
    console.log('[Database] Migrations verificadas/executadas com sucesso.');
  }
  return AppDataSource;
};
