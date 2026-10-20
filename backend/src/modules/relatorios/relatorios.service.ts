import { AppDataSource } from '../../config/database';
import { Coletor } from '../../database/entities/Coletor';
import { Movimentacao } from '../../database/entities/Movimentacao';
import { Configuracao } from '../../database/entities/Configuracao';

export class RelatoriosService {
  public static async obterMetricasDashboard(): Promise<any> {
    const coletorRepo = AppDataSource.getRepository(Coletor);
    const movRepo = AppDataSource.getRepository(Movimentacao);
    const configRepo = AppDataSource.getRepository(Configuracao);

    const [total, disponiveis, emUso, manutencao, inativos] = await Promise.all([
      coletorRepo.count(),
      coletorRepo.count({ where: { status: 'DISPONIVEL' } }),
      coletorRepo.count({ where: { status: 'EM_USO' } }),
      coletorRepo.count({ where: { status: 'MANUTENCAO' } }),
      coletorRepo.count({ where: { status: 'INATIVO' } }),
    ]);

    const cfgLimite = await configRepo.findOne({ where: { chave: 'LIMITE_USO_MINUTOS' } });
    const limiteMinutos = cfgLimite ? Number(cfgLimite.valor) : 480;

    const abertas = await movRepo.find({
      where: { dataRetorno: undefined as any },
      select: ['id', 'dataSaida'],
    });

    const now = Date.now();
    let atrasados = 0;
    for (const mov of abertas) {
      if (!mov.dataRetorno) {
        const diffMinutos = Math.floor((now - new Date(mov.dataSaida).getTime()) / 60000);
        if (diffMinutos > limiteMinutos) {
          atrasados += 1;
        }
      }
    }

    return {
      total,
      disponiveis,
      emUso,
      manutencao,
      inativos,
      atrasados,
      limiteMinutosSLA: limiteMinutos,
    };
  }

  public static async historico(filtros: {
    dataInicio?: string;
    dataFim?: string;
    matricula?: number;
    patrimonio?: string;
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

    if (filtros.dataInicio) {
      query.andWhere('m.dataSaida >= :inicio', { inicio: `${filtros.dataInicio} 00:00:00` });
    }

    if (filtros.dataFim) {
      query.andWhere('m.dataSaida <= :fim', { fim: `${filtros.dataFim} 23:59:59` });
    }

    query.orderBy('m.dataSaida', 'DESC').skip(skip).take(limit);

    const [movimentacoes, total] = await query.getManyAndCount();

    return {
      movimentacoes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
