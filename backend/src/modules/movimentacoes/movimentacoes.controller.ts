import { Request, Response, NextFunction } from 'express';
import { MovimentacoesService } from './movimentacoes.service';

export class MovimentacoesController {
  public async retirada(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matricula, patrimonio, crachaOperador } = req.body;
      const operadorId = req.operador!.id;

      const movimentacao = await MovimentacoesService.retirada({
        matricula: Number(matricula),
        patrimonio: String(patrimonio),
        operadorId,
        crachaOperador: crachaOperador ? String(crachaOperador) : null,
      });

      res.status(201).json({
        sucesso: true,
        mensagem: 'Retirada registrada com sucesso.',
        dados: {
          movimentacaoId: movimentacao.id,
          patrimonio: movimentacao.coletor.patrimonio,
          colaboradorNome: movimentacao.nomeColaborador,
          dataSaida: movimentacao.dataSaida,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async buscarAtivaPorColaborador(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identificador } = req.params;
      const dados = await MovimentacoesService.buscarAtivaPorColaborador(identificador);
      res.status(200).json({
        sucesso: true,
        dados,
      });
    } catch (err) {
      next(err);
    }
  }

  public async buscarAtivaPorPatrimonio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patrimonio } = req.params;
      const dados = await MovimentacoesService.buscarAtivaPorPatrimonio(patrimonio);
      res.status(200).json({
        sucesso: true,
        dados,
      });
    } catch (err) {
      next(err);
    }
  }

  public async devolucao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { avaria, motivoManutencao, numeroOs, observacao, crachaOperador } = req.body;
      const operadorId = req.operador!.id;

      const resultado = await MovimentacoesService.devolucao(id, {
        avaria: Boolean(avaria),
        motivoManutencao: motivoManutencao ? String(motivoManutencao).trim() : null,
        numeroOs: numeroOs ? String(numeroOs).trim() : null,
        observacao: observacao ? String(observacao).trim() : null,
        operadorId,
        crachaOperador: crachaOperador ? String(crachaOperador) : null,
      });

      res.status(200).json({
        sucesso: true,
        mensagem: 'Devolução concluída com sucesso.',
        dados: resultado,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listarAtivas(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ativas = await MovimentacoesService.listarAtivas();
      res.status(200).json({
        sucesso: true,
        dados: ativas,
      });
    } catch (err) {
      next(err);
    }
  }

  public async devolucaoPorColetor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idOuPatrimonio } = req.params;
      const { avaria, motivoManutencao, numeroOs, observacao } = req.body;
      const operadorId = req.operador!.id;

      const resultado = await MovimentacoesService.devolucaoPorColetor(idOuPatrimonio, {
        avaria: Boolean(avaria),
        motivoManutencao: motivoManutencao ? String(motivoManutencao).trim() : null,
        numeroOs: numeroOs ? String(numeroOs).trim() : null,
        observacao: observacao ? String(observacao).trim() : null,
        operadorId,
      });

      res.status(200).json({
        sucesso: true,
        mensagem: 'Devolução concluída com sucesso.',
        dados: resultado,
      });
    } catch (err) {
      next(err);
    }
  }
}

