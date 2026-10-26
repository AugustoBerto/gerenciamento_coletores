import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectDatabase } from './config/database';
import { AuthService } from './modules/auth/auth.service';

const PORT = Number(process.env.PORT || 3131);

const bootstrap = async () => {
  try {
    await connectDatabase();
    await AuthService.assegurarSuporteTI();
    await AuthService.assegurarMonitorGeral();
    const app = createApp();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Gerenciamento de Coletores API escutando na porta ${PORT}`);
      console.log(`[Server] Roteado via Dass API Gateway em http://localhost:2399/api/coletores`);
    });

    const shutdown = async () => {
      console.log('[Server] Encerrando conexões com elegância...');
      server.close(() => {
        console.log('[Server] Servidor HTTP finalizado.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[Fatal Error] Falha ao iniciar o backend:', error);
    process.exit(1);
  }
};

bootstrap();
