import { Request, Response, NextFunction } from 'express';
import { AutorizadosService } from './autorizados.service';

export class AutorizadosController {
  public static async listar(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dados = await AutorizadosService.listar();
      res.status(200).json({
        sucesso: true,
        dados,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async consultar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identificador = String(req.query.identificador || req.params.identificador || '').trim();
      const dados = await AutorizadosService.consultarColaborador(identificador);
      res.status(200).json({
        sucesso: true,
        dados,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async adicionar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identificador } = req.body;
      const criadoPorId = req.operador?.id || null;
      const novo = await AutorizadosService.adicionar(identificador, criadoPorId);
      res.status(201).json({
        sucesso: true,
        mensagem: `Colaborador ${novo.nome} adicionado à lista de autorizados com sucesso.`,
        dados: novo,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await AutorizadosService.remover(id);
      res.status(200).json({
        sucesso: true,
        mensagem: 'Autorização removida com sucesso.',
      });
    } catch (err) {
      next(err);
    }
  }
}
