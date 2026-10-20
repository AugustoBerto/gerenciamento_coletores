import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './shared/middlewares/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import colaboradoresRoutes from './modules/colaboradores/colaboradores.routes';
import movimentacoesRoutes from './modules/movimentacoes/movimentacoes.routes';
import coletoresRoutes from './modules/coletores/coletores.routes';
import relatoriosRoutes from './modules/relatorios/relatorios.routes';
import configuracoesRoutes from './modules/configuracoes/configuracoes.routes';
import { AppDataSource } from './config/database';

export const createApp = (): Express => {
  const app = express();

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permite durante ambiente de desenvolvimento
        }
      },
      credentials: true,
    })
  );

  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json());

  // Healthchecks
  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/health/ready', async (_req, res) => {
    const dbReady = AppDataSource.isInitialized;
    res.status(dbReady ? 200 : 503).json({
      status: dbReady ? 'ok' : 'not_ready',
      database: dbReady,
    });
  });

  // Módulos da Aplicação (O Gateway remove o prefixo /api/coletores)
  app.use('/auth', authRoutes);
  app.use('/colaboradores', colaboradoresRoutes);
  app.use('/movimentacoes', movimentacoesRoutes);
  app.use('/coletores', coletoresRoutes);
  app.use('/relatorios', relatoriosRoutes);
  app.use('/configuracoes', configuracoesRoutes);

  // Fallback raiz
  app.get('/', (_req, res) => {
    res.status(200).json({
      sistema: 'DASS - Gerenciamento de Coletores',
      versao: '1.0.0',
      status: 'online',
    });
  });

  // Middleware global de erros
  app.use(errorHandler);

  return app;
};
