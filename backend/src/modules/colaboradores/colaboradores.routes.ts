import { Router } from 'express';
import { ColaboradoresController } from './colaboradores.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new ColaboradoresController();

router.use(authMiddleware);

router.post('/validar-cracha', controller.validarCracha);
router.get('/bloqueios', controller.listarBloqueios);
router.post('/bloqueios', controller.criarBloqueio);
router.delete('/bloqueios/:id', controller.removerBloqueio);

export default router;
