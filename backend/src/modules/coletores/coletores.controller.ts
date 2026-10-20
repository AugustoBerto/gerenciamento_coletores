import { Request, Response, NextFunction } from 'express';
import { ColetoresService } from './coletores.service';
import { StatusColetor } from '../../database/entities/Coletor';

export class ColetoresController {
  public async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busca, status, page, limit } = req.query;
      const resultado = await ColetoresService.listar({
        busca: busca ? String(busca) : undefined,
        status: status ? (String(status) as StatusColetor) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        sucesso: true,
        dados: resultado.coletores,
        paginacao: {
          total: resultado.total,
          pagina: resultado.page,
          totalPaginas: resultado.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const coletor = await ColetoresService.buscarPorId(id);
      res.status(200).json({
        sucesso: true,
        dados: coletor,
      });
    } catch (err) {
      next(err);
    }
  }

  public async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patrimonio, numeroSerie, marca, modelo } = req.body;
      const coletor = await ColetoresService.criar({
        patrimonio,
        numeroSerie,
        marca,
        modelo,
      });

      res.status(201).json({
        sucesso: true,
        mensagem: 'Coletor cadastrado com sucesso.',
        dados: coletor,
      });
    } catch (err) {
      next(err);
    }
  }

  public async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { numeroSerie, marca, modelo } = req.body;
      const coletor = await ColetoresService.atualizar(id, {
        numeroSerie,
        marca,
        modelo,
      });

      res.status(200).json({
        sucesso: true,
        mensagem: 'Coletor atualizado com sucesso.',
        dados: coletor,
      });
    } catch (err) {
      next(err);
    }
  }

  public async solicitarManutencao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { motivo, numeroOs } = req.body;
      const operadorId = req.operador!.id;

      const coletor = await ColetoresService.enviarManutencao(
        id,
        String(motivo || 'Defeito apontado por operador'),
        operadorId,
        String(numeroOs || '')
      );

      res.status(200).json({
        sucesso: true,
        mensagem: 'Solicitação de manutenção registrada com sucesso.',
        dados: coletor,
      });
    } catch (err) {
      next(err);
    }
  }

  public async enviarManutencao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { motivo, numeroOs } = req.body;
      const operadorId = req.operador!.id;

      const coletor = await ColetoresService.enviarManutencao(
        id,
        String(motivo || 'Defeito técnico'),
        operadorId,
        String(numeroOs || '')
      );

      res.status(200).json({
        sucesso: true,
        mensagem: 'Coletor encaminhado para manutenção com sucesso.',
        dados: coletor,
      });
    } catch (err) {
      next(err);
    }
  }

  public async concluirManutencao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { solucao } = req.body;
      const operadorId = req.operador!.id;

      const coletor = await ColetoresService.concluirManutencao(id, String(solucao || 'Manutenção concluída'), operadorId);

      res.status(200).json({
        sucesso: true,
        mensagem: 'Coletor liberado e disponível para uso.',
        dados: coletor,
      });
    } catch (err) {
      next(err);
    }
  }

  public async inativar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const coletor = await ColetoresService.inativar(id);
      res.status(200).json({
        sucesso: true,
        mensagem: 'Coletor inativado com sucesso.',
        dados: coletor,
      });
    } catch (err) {
      next(err);
    }
  }
}
