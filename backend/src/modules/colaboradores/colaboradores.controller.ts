import { Request, Response, NextFunction } from 'express';
import { ColaboradoresService } from './colaboradores.service';

export class ColaboradoresController {
  public async validarCracha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { codigo } = req.body;
      const colaborador = await ColaboradoresService.validarCracha(codigo);
      res.status(200).json({
        sucesso: true,
        dados: colaborador,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listarBloqueios(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bloqueios = await ColaboradoresService.listarBloqueios();
      res.status(200).json({
        sucesso: true,
        dados: bloqueios,
      });
    } catch (err) {
      next(err);
    }
  }

  public async criarBloqueio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matricula, motivo } = req.body;
      const operadorId = req.operador!.id;
      const bloqueio = await ColaboradoresService.criarBloqueio(Number(matricula), String(motivo), operadorId);
      res.status(201).json({
        sucesso: true,
        mensagem: 'Bloqueio preventivo registrado com sucesso.',
        dados: bloqueio,
      });
    } catch (err) {
      next(err);
    }
  }

  public async removerBloqueio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await ColaboradoresService.removerBloqueio(id);
      res.status(200).json({
        sucesso: true,
        mensagem: 'Bloqueio removido com sucesso.',
      });
    } catch (err) {
      next(err);
    }
  }
}
