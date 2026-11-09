import { AppDataSource } from '../../config/database';
import { Coletor } from '../../database/entities/Coletor';
import { Movimentacao } from '../../database/entities/Movimentacao';
import { Configuracao } from '../../database/entities/Configuracao';
import { MovimentacoesService } from '../movimentacoes/movimentacoes.service';

export class RelatoriosService {
  public static async obterMetricasDashboard(): Promise<any> {
    const { ativo: slaAtivo, limiteMinutos } = await MovimentacoesService.obterLimitesSLA();

    // 1. Agregação condicional atômica no PostgreSQL (1 única query para todos os status)
    const queryStatsColetores = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'DISPONIVEL')::int AS disponiveis,
        COUNT(*) FILTER (WHERE status = 'EM_USO')::int AS em_uso,
        COUNT(*) FILTER (WHERE status = 'MANUTENCAO')::int AS manutencao,
        COUNT(*) FILTER (WHERE status = 'INATIVO')::int AS inativos
      FROM gestao_coletores.coletores;
    `;

    // 2. Contagem de atrasados de SLA direto no PostgreSQL (usa índice parcial de custódia aberta)
    const queryAtrasados = slaAtivo
      ? `
        SELECT COUNT(*)::int AS atrasados
        FROM gestao_coletores.movimentacoes
        WHERE data_retorno IS NULL 
          AND data_saida < NOW() - ($1 || ' minutes')::interval;
      `
      : null;

    const [statsResult, atrasadosResult] = await Promise.all([
      AppDataSource.query(queryStatsColetores),
      queryAtrasados ? AppDataSource.query(queryAtrasados, [limiteMinutos]) : Promise.resolve([{ atrasados: 0 }]),
    ]);

    const stats = statsResult[0] || { total: 0, disponiveis: 0, em_uso: 0, manutencao: 0, inativos: 0 };
    const atrasados = Number(atrasadosResult[0]?.atrasados || 0);

    return {
      total: Number(stats.total || 0),
      disponiveis: Number(stats.disponiveis || 0),
      emUso: Number(stats.em_uso || 0),
      manutencao: Number(stats.manutencao || 0),
      inativos: Number(stats.inativos || 0),
      atrasados,
      slaAtivo,
      limiteMinutosSLA: limiteMinutos,
    };
  }

  public static async historico(filtros: {
    dataInicio?: string;
    dataFim?: string;
    matricula?: number;
    patrimonio?: string;
    tipoPreferencia?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.min(100, Math.max(1, filtros.limit || 20));
    const skip = (page - 1) * limit;

    const movRepo = AppDataSource.getRepository(Movimentacao);
    const query = movRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.coletor', 'c')
      .innerJoinAndSelect('m.operadorSaida', 'ops')
      .leftJoinAndSelect('m.operadorRetorno', 'opr');

    if (filtros.patrimonio) {
      query.andWhere('c.patrimonio = :pat', { pat: filtros.patrimonio.trim() });
    }

    if (filtros.matricula) {
      query.andWhere('m.matriculaColaborador = :mat', { mat: filtros.matricula });
    }

    if (filtros.tipoPreferencia) {
      query.andWhere('m.tipoPreferencia = :tp', { tp: filtros.tipoPreferencia.trim() });
    }

    if (filtros.dataInicio) {
      query.andWhere('m.dataSaida >= :inicio', { inicio: `${filtros.dataInicio} 00:00:00` });
    }

    if (filtros.dataFim) {
      query.andWhere('m.dataSaida <= :fim', { fim: `${filtros.dataFim} 23:59:59` });
    }

    query.orderBy('m.dataSaida', 'DESC').skip(skip).take(limit);

    const [movimentacoesRaw, total] = await query.getManyAndCount();

    const movimentacoes = movimentacoesRaw.map((m) => ({
      ...m,
      operadorSaida: m.operadorSaida
        ? {
            ...m.operadorSaida,
            nome: m.nomeMonitorSaida || m.operadorSaida.nome,
          }
        : null,
      operadorRetorno:
        m.operadorRetorno || m.nomeMonitorRetorno
          ? {
              ...(m.operadorRetorno || {}),
              nome: m.nomeMonitorRetorno || m.operadorRetorno?.nome || '-',
            }
          : null,
    }));

    return {
      movimentacoes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
