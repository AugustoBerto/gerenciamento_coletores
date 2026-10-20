import { Router } from 'express';
import { RelatoriosController } from './relatorios.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new RelatoriosController();

router.use(authMiddleware);

router.get('/metricas-dashboard', controller.metricasDashboard);
router.get('/historico', controller.historico);

export default router;
