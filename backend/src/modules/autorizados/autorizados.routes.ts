import { Router } from 'express';
import { authMiddleware, requireTI } from '../../shared/middlewares/auth.middleware';
import { AutorizadosController } from './autorizados.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireTI);

router.get('/', AutorizadosController.listar);
router.get('/consultar', AutorizadosController.consultar);
router.post('/', AutorizadosController.adicionar);
router.delete('/:id', AutorizadosController.remover);

export default router;
