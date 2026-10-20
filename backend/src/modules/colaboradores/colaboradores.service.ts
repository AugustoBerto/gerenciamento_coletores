import { IsNull } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { BloqueioColaborador } from '../../database/entities/BloqueioColaborador';
import { Movimentacao } from '../../database/entities/Movimentacao';

export interface ColaboradorInfo {
  matricula: number;
  nome: string;
  setor: string;
  funcao: string;
  apto: boolean;
  pendencia?: {
    coletorPatrimonio: string;
    dataSaida: Date;
    minutosEmUso: number;
  };
}
export type ColaboradorFabril = ColaboradorInfo;

export class ColaboradoresService {
  public static async validarCracha(codigoRaw: string): Promise<ColaboradorInfo> {
    const codigo = String(codigoRaw || '').trim();
    if (!codigo) {
      throw new AppError('Código do crachá não informado.', 400, 'CRACHA_OBRIGATORIO');
    }

    const numericCode = /^\d+$/.test(codigo) ? BigInt(codigo) : null;

    // 1. Busca na base corporativa de colaboradores
    const query = `
      SELECT 
        c.matricula, 
        c.nome, 
        c.codbarras, 
        c.rfid, 
        COALESCE(l.nome_setor, 'Setor Operacional') AS setor, 
        COALESCE(l.funcao, 'Operador') AS funcao
      FROM colaborador.colaboradores c
      LEFT JOIN colaborador.lista_funcionario l ON l.matricula = c.matricula
      WHERE c.codbarras = $1 
         OR ($2::bigint IS NOT NULL AND (c.matricula = $2 OR c.rfid = $2))
      LIMIT 1;
    `;

    const results = await AppDataSource.query(query, [
      numericCode ? numericCode.toString() : codigo,
      numericCode ? numericCode.toString() : null,
    ]);

    if (!results || results.length === 0) {
      throw new AppError('Crachá não localizado na base corporativa de colaboradores.', 404, 'CRACHA_NAO_ENCONTRADO');
    }

    const colab = results[0];
    const matricula = Number(colab.matricula);

    // 2. Verifica se possui bloqueio preventivo do almoxarifado
    const bloqueioRepo = AppDataSource.getRepository(BloqueioColaborador);
    const bloqueioAtivo = await bloqueioRepo.findOne({
      where: { matricula, ativo: true },
    });

    if (bloqueioAtivo) {
      throw new AppError(
        `Retirada bloqueada para este colaborador: ${bloqueioAtivo.motivo}`,
        403,
        'COLABORADOR_BLOQUEADO',
        { matricula, motivo: bloqueioAtivo.motivo }
      );
    }

    // 3. Verifica se já possui coletor em custódia aberta (Trava 1:1)
    const movRepo = AppDataSource.getRepository(Movimentacao);
    const custodiaAberta = await movRepo.findOne({
      where: { matriculaColaborador: matricula, dataRetorno: IsNull() },
      relations: { coletor: true },
    });

    if (custodiaAberta && custodiaAberta.dataRetorno === null) {
      const minutosEmUso = Math.floor((Date.now() - new Date(custodiaAberta.dataSaida).getTime()) / 60000);
      throw new AppError(
        `Colaborador já possui o coletor patrimônio ${custodiaAberta.coletor.patrimonio} retirado em ${new Date(custodiaAberta.dataSaida).toLocaleTimeString('pt-BR')}.`,
        409,
        'COLABORADOR_POSSUI_PENDENCIA',
        {
          matricula,
          nome: colab.nome,
          coletorPatrimonio: custodiaAberta.coletor.patrimonio,
          dataSaida: custodiaAberta.dataSaida,
          minutosEmUso,
        }
      );
    }

    return {
      matricula,
      nome: colab.nome,
      setor: colab.setor,
      funcao: colab.funcao,
      apto: true,
    };
  }

  public static async listarBloqueios(): Promise<BloqueioColaborador[]> {
    const bloqueioRepo = AppDataSource.getRepository(BloqueioColaborador);
    return bloqueioRepo.find({
      where: { ativo: true },
      relations: { operador: true },
      order: { criadoEm: 'DESC' },
    });
  }

  public static async criarBloqueio(matricula: number, motivo: string, operadorId: string): Promise<BloqueioColaborador> {
    const bloqueioRepo = AppDataSource.getRepository(BloqueioColaborador);
    let bloqueio = await bloqueioRepo.findOne({ where: { matricula, ativo: true } });
    if (bloqueio) {
      bloqueio.motivo = motivo;
      bloqueio.operadorId = operadorId;
      return bloqueioRepo.save(bloqueio);
    }

    bloqueio = bloqueioRepo.create({
      matricula,
      motivo,
      operadorId,
      ativo: true,
    });
    return bloqueioRepo.save(bloqueio);
  }

  public static async removerBloqueio(id: string): Promise<void> {
    const bloqueioRepo = AppDataSource.getRepository(BloqueioColaborador);
    const bloqueio = await bloqueioRepo.findOne({ where: { id } });
    if (bloqueio) {
      bloqueio.ativo = false;
      await bloqueioRepo.save(bloqueio);
    }
  }
}
