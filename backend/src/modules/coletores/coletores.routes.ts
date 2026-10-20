import { Router } from 'express';
import { ColetoresController } from './coletores.controller';
import { authMiddleware, requireTI, requireStrictTI, requireAdmin } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new ColetoresController();

router.use(authMiddleware);

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', requireTI, controller.criar);
router.put('/:id', requireTI, controller.atualizar);
router.post('/:id/solicitar-manutencao', controller.solicitarManutencao);
router.post('/:id/enviar-manutencao', requireStrictTI, controller.enviarManutencao);
router.post('/:id/concluir-manutencao', requireStrictTI, controller.concluirManutencao);
router.post('/:id/reativar', requireTI, controller.reativar);
router.delete('/:id', requireTI, controller.inativar);

export default router;
