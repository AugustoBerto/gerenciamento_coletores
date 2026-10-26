import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../config/database';
import { Configuracao } from '../../database/entities/Configuracao';
import { authMiddleware, requireAdmin, requireTI } from '../../shared/middlewares/auth.middleware';
import { ConfiguracoesService } from './configuracoes.service';
import { MovimentacoesService } from '../movimentacoes/movimentacoes.service';

const router = Router();

router.use(authMiddleware);

// --- Gestão de SLA Global ---
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = AppDataSource.getRepository(Configuracao);
    const configs = await repo.find();
    res.status(200).json({
      sucesso: true,
      dados: configs,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limiteUsoMinutos, alertaAmareloPercentual, slaAtivo } = req.body;
    const repo = AppDataSource.getRepository(Configuracao);

    if (slaAtivo !== undefined) {
      await repo.save({
        chave: 'SLA_ATIVO',
        valor: String(Boolean(slaAtivo)),
        descricao: 'Indica se o controle e monitoramento de SLA está ativo',
      });
    }

    if (limiteUsoMinutos !== undefined) {
      await repo.save({
        chave: 'LIMITE_USO_MINUTOS',
        valor: String(limiteUsoMinutos),
        descricao: 'Limite máximo de uso contínuo do coletor em minutos (8h)',
      });
    }

    if (alertaAmareloPercentual !== undefined) {
      await repo.save({
        chave: 'ALERTA_AMARELO_PERCENTUAL',
        valor: String(alertaAmareloPercentual),
        descricao: 'Percentual do tempo de uso para acionar alerta preventivo',
      });
    }

    MovimentacoesService.invalidarCacheSLA();

    const configs = await repo.find();
    res.status(200).json({
      sucesso: true,
      mensagem: 'Parâmetros atualizados com sucesso.',
      dados: configs,
    });
  } catch (err) {
    next(err);
  }
});

// --- Gestão de Usuários Autorizados (Whitelist & Papéis) ---
router.get('/usuarios', requireTI, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarios = await ConfiguracoesService.listarUsuarios();
    res.status(200).json({
      sucesso: true,
      dados: usuarios,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/usuarios/consultar/:identificador', requireTI, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identificador } = req.params;
    const dados = await ConfiguracoesService.consultarUsuarioCorporativo(identificador);
    res.status(200).json({
      sucesso: true,
      dados,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/usuarios', requireTI, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { usuario, matricula, papel, nome, cargo } = req.body;
    const novo = await ConfiguracoesService.cadastrarUsuario(
      {
        usuario,
        matricula,
        papel,
        nome,
        cargo,
      },
      req.operador!
    );
    res.status(201).json({
      sucesso: true,
      mensagem: `Monitor ${novo.usuario} cadastrado com sucesso.`,
      dados: novo,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/usuarios/:id', requireTI, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { papel, ativo } = req.body;

    const atualizado = await ConfiguracoesService.atualizarUsuario(
      id,
      { papel, ativo },
      req.operador!
    );

    res.status(200).json({
      sucesso: true,
      mensagem: 'Dados do monitor atualizados com sucesso.',
      dados: atualizado,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/usuarios/:id', requireTI, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const resultado = await ConfiguracoesService.excluirUsuario(id, req.operador!);

    res.status(200).json({
      sucesso: true,
      mensagem: resultado.mensagem,
    });
  } catch (err) {
    next(err);
  }
});

// --- Gestão de Setores de Localização ---
router.get('/setores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const somenteAtivos = req.query.somenteAtivos === 'true';
    const setores = await ConfiguracoesService.listarSetores(somenteAtivos);
    res.status(200).json({
      sucesso: true,
      dados: setores,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/setores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome, descricao } = req.body;
    const novo = await ConfiguracoesService.cadastrarSetor({ nome, descricao });
    res.status(201).json({
      sucesso: true,
      mensagem: `Setor "${novo.nome}" cadastrado com sucesso.`,
      dados: novo,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/setores/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body;
    const atualizado = await ConfiguracoesService.atualizarSetor(id, { nome, descricao, ativo });
    res.status(200).json({
      sucesso: true,
      mensagem: `Setor "${atualizado.nome}" atualizado com sucesso.`,
      dados: atualizado,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/setores/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const atualizado = await ConfiguracoesService.toggleStatusSetor(id);
    res.status(200).json({
      sucesso: true,
      mensagem: `Status do setor "${atualizado.nome}" alterado para ${atualizado.ativo ? 'ativo' : 'inativo'}.`,
      dados: atualizado,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/setores/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const resultado = await ConfiguracoesService.excluirSetor(id);
    res.status(200).json({
      sucesso: true,
      mensagem: resultado.mensagem,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
