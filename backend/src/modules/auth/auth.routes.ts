import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login);
router.get('/me', authMiddleware, controller.me);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

export default router;
