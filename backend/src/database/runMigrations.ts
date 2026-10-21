import { AppDataSource } from '../config/database';

async function run(): Promise<void> {
  console.log('[Migrations] Conectando ao PostgreSQL...');
  await AppDataSource.initialize();

  console.log('[Migrations] Verificando e executando migrations pendentes...');
  const executed = await AppDataSource.runMigrations();

  if (!executed || executed.length === 0) {
    console.log('[Migrations] Nenhuma migration pendente. O banco de dados já está atualizado!');
  } else {
    console.log(`[Migrations] Sucesso! ${executed.length} migration(s) aplicada(s):`);
    executed.forEach((m) => {
      console.log(`  ✓ ${m.name}`);
    });
  }

  await AppDataSource.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Migrations] Erro ao executar migrations:', err);
  process.exit(1);
});
