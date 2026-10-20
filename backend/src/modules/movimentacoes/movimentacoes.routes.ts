import { Router } from 'express';
import { MovimentacoesController } from './movimentacoes.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new MovimentacoesController();

router.use(authMiddleware);

router.get('/ativas', controller.listarAtivas);
router.get('/ativa-por-colaborador/:identificador', controller.buscarAtivaPorColaborador);
router.get('/ativa-por-patrimonio/:patrimonio', controller.buscarAtivaPorPatrimonio);
router.post('/retirada', controller.retirada);
router.post('/:id/devolucao', controller.devolucao);
router.post('/coletor/:idOuPatrimonio/devolucao', controller.devolucaoPorColetor);

export default router;
