import { Request, Response, NextFunction } from 'express';
import { RelatoriosService } from './relatorios.service';

export class RelatoriosController {
  public async metricasDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metricas = await RelatoriosService.obterMetricasDashboard();
      res.status(200).json({
        sucesso: true,
        dados: metricas,
      });
    } catch (err) {
      next(err);
    }
  }

  public async historico(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dataInicio, dataFim, matricula, patrimonio, tipoPreferencia, page, limit } = req.query;
      const resultado = await RelatoriosService.historico({
        dataInicio: dataInicio ? String(dataInicio) : undefined,
        dataFim: dataFim ? String(dataFim) : undefined,
        matricula: matricula ? Number(matricula) : undefined,
        patrimonio: patrimonio ? String(patrimonio) : undefined,
        tipoPreferencia: tipoPreferencia ? String(tipoPreferencia) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        sucesso: true,
        dados: resultado.movimentacoes,
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
}
