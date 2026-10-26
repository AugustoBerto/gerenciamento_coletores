import { IsNull } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { BloqueioColaborador } from '../../database/entities/BloqueioColaborador';
import { Movimentacao } from '../../database/entities/Movimentacao';
import { Operador } from '../../database/entities/Operador';

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
  /**
   * Localização ultra-rápida e resiliente de colaborador na base corporativa (PostgreSQL).
   * Otimizada com CTE + UNION ALL lazy evaluation:
   * - Testa Matrícula (Index Seek imediato)
   * - Testa Código de Barras (exato ou sem zeros à esquerda)
   * - Testa RFID (Hexadecimal, Decimal e Case-insensitive)
   * - Left Join com lista_funcionario executado APENAS para o colaborador localizado (evita Full Scan de tabelas).
   */
  public static async buscarColaboradorCorporativo(codigoRaw: string): Promise<{
    matricula: number;
    nome: string;
    codbarras: string | null;
    rfid: string | null;
    setor: string;
    funcao: string;
  }> {
    const raw = String(codigoRaw || '')
      .replace(/[\r\n\t]/g, '')
      .trim();

    if (!raw) {
      throw new AppError('Informe o Código de Barras ou aproxime o crachá no leitor RFID do colaborador.', 400, 'CRACHA_OBRIGATORIO');
    }

    let numericVal: string | null = null;
    let hexDecVal: string | null = null;

    if (/^\d+$/.test(raw)) {
      try {
        numericVal = BigInt(raw).toString();
      } catch {}
    } else if (/^[0-9a-fA-F]{4,16}$/.test(raw)) {
      try {
        hexDecVal = BigInt('0x' + raw).toString();
      } catch {}
    }

    // Se tiver zeros à esquerda (ex: bipe de código de barras formatado com zeros)
    const stripped = raw.replace(/^0+/, '');
    let strippedVal: string | null = null;
    if (stripped && stripped !== raw && /^\d+$/.test(stripped)) {
      try {
        strippedVal = BigInt(stripped).toString();
      } catch {}
    }

    // Se a entrada não for número nem hexadecimal legível, não é possível bater com colunas bigint
    if (!numericVal && !hexDecVal && !strippedVal) {
      throw new AppError('Crachá não localizado na base corporativa da fábrica. Bipe o Código de Barras ou aproxime o leitor RFID.', 404, 'CRACHA_NAO_ENCONTRADO');
    }

    const query = `
      WITH candidato AS (
        -- 1. Busca exclusiva por Código de Barras (exato ou sem zeros à esquerda)
        SELECT matricula, nome, codbarras, rfid
        FROM colaborador.colaboradores
        WHERE ($1::bigint IS NOT NULL AND codbarras = $1::bigint)
           OR ($2::bigint IS NOT NULL AND codbarras = $2::bigint)

        UNION ALL

        -- 2. Busca exclusiva por RFID (decimal nativo ou convertido de hexadecimal)
        SELECT matricula, nome, codbarras, rfid
        FROM colaborador.colaboradores
        WHERE ($1::bigint IS NOT NULL AND rfid = $1::bigint)
           OR ($2::bigint IS NOT NULL AND rfid = $2::bigint)
           OR ($3::bigint IS NOT NULL AND rfid = $3::bigint)

        LIMIT 1
      )
      SELECT 
        c.matricula, 
        c.nome, 
        c.codbarras, 
        c.rfid, 
        COALESCE(l.nome_setor, 'Setor Operacional') AS setor, 
        COALESCE(l.funcao, 'Operador') AS funcao
      FROM candidato c
      LEFT JOIN colaborador.lista_funcionario l ON l.matricula = c.matricula
      LIMIT 1;
    `;

    const params = [
      numericVal,   // $1
      strippedVal,  // $2
      hexDecVal     // $3
    ];

    const results = await AppDataSource.query(query, params);

    if (!results || results.length === 0) {
      // Verificação preventiva: o operador tentou digitar uma matrícula?
      if (numericVal || strippedVal) {
        const checkMatriculaQuery = `
          SELECT matricula, nome
          FROM colaborador.colaboradores
          WHERE ($1::bigint IS NOT NULL AND matricula = $1::bigint)
             OR ($2::bigint IS NOT NULL AND matricula = $2::bigint)
          LIMIT 1;
        `;
        const resMat = await AppDataSource.query(checkMatriculaQuery, [numericVal, strippedVal]);
        if (resMat && resMat.length > 0) {
          throw new AppError(
            'O uso de matrícula não é permitido para check-in ou check-out. Por favor, bipe o Código de Barras ou aproxime o crachá no leitor RFID.',
            400,
            'MATRICULA_NAO_PERMITIDA'
          );
        }
      }

      throw new AppError(
        'Crachá não localizado na base corporativa da fábrica. Bipe o Código de Barras ou aproxime o leitor RFID.',
        404,
        'CRACHA_NAO_ENCONTRADO'
      );
    }

    const colab = results[0];
    return {
      matricula: Number(colab.matricula),
      nome: String(colab.nome || 'Colaborador'),
      codbarras: colab.codbarras ? String(colab.codbarras) : null,
      rfid: colab.rfid ? String(colab.rfid) : null,
      setor: String(colab.setor || 'Setor Operacional'),
      funcao: String(colab.funcao || 'Operador'),
    };
  }

  public static async validarPorMatricula(matricula: number): Promise<ColaboradorInfo> {
    if (!matricula || isNaN(matricula)) {
      throw new AppError('Matrícula do colaborador inválida.', 400, 'MATRICULA_INVALIDA');
    }

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
      WHERE c.matricula = $1::bigint
      LIMIT 1;
    `;

    const results = await AppDataSource.query(query, [matricula]);
    if (!results || results.length === 0) {
      throw new AppError('Colaborador não localizado na base corporativa.', 404, 'COLABORADOR_NAO_ENCONTRADO');
    }

    const colab = results[0];

    // 1. Verifica se possui bloqueio preventivo do almoxarifado
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

    // 2. Verifica se já possui coletor em custódia aberta (Trava 1:1)
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
      nome: String(colab.nome || 'Colaborador'),
      setor: String(colab.setor || 'Setor Operacional'),
      funcao: String(colab.funcao || 'Operador'),
      apto: true,
    };
  }

  public static async validarCracha(codigoRaw: string): Promise<ColaboradorInfo> {
    // 1. Busca ultra-otimizada na base corporativa exclusiva por Código de Barras ou RFID
    const colab = await this.buscarColaboradorCorporativo(codigoRaw);

    // 2. Valida elegibilidade e travas pela matrícula identificada
    return this.validarPorMatricula(colab.matricula);
  }

  public static async validarMonitorPorCracha(codigoRaw: string): Promise<{
    id: string | null;
    matricula: number;
    nome: string;
    cargo: string;
    papel: string;
  }> {
    const colab = await this.buscarColaboradorCorporativo(codigoRaw);
    const operadorRepo = AppDataSource.getRepository(Operador);

    const operador = await operadorRepo.findOne({
      where: { matricula: colab.matricula },
    });

    if (operador && !operador.ativo) {
      throw new AppError(
        `O monitor ${operador.nome} está inativo no sistema e não pode liberar ou receber equipamentos.`,
        403,
        'OPERADOR_INATIVO'
      );
    }

    return {
      id: operador ? operador.id : null,
      matricula: colab.matricula,
      nome: operador ? operador.nome : colab.nome,
      cargo: (operador ? operador.cargo : colab.funcao) || 'Monitor',
      papel: operador ? operador.papel : 'OPERADOR',
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
