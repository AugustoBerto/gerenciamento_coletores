import { AppDataSource } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { Coletor } from '../../database/entities/Coletor';
import { Movimentacao } from '../../database/entities/Movimentacao';
import { HistoricoManutencao } from '../../database/entities/HistoricoManutencao';
import { Configuracao } from '../../database/entities/Configuracao';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';

export interface RetiradaDTO {
  matricula: number;
  patrimonio: string;
  operadorId: string;
  crachaOperador?: string | null;
}

export interface DevolucaoDTO {
  avaria: boolean;
  motivoManutencao?: string | null;
  numeroOs?: string | null;
  observacao?: string | null;
  operadorId: string;
  crachaOperador?: string | null;
}

export class MovimentacoesService {
  private static slaCache: { ativo: boolean; limiteMinutos: number; alertaPercentual: number; timestamp: number } | null = null;
  private static readonly SLA_CACHE_TTL_MS = 60000; // 1 minuto de cache em memória

  public static invalidarCacheSLA(): void {
    this.slaCache = null;
  }

  public static async obterLimitesSLA(): Promise<{ ativo: boolean; limiteMinutos: number; alertaPercentual: number }> {
    const now = Date.now();
    if (this.slaCache && now - this.slaCache.timestamp < this.SLA_CACHE_TTL_MS) {
      return {
        ativo: this.slaCache.ativo,
        limiteMinutos: this.slaCache.limiteMinutos,
        alertaPercentual: this.slaCache.alertaPercentual,
      };
    }

    const configRepo = AppDataSource.getRepository(Configuracao);
    const [cfgLimite, cfgAlerta, cfgAtivo] = await Promise.all([
      configRepo.findOne({ where: { chave: 'LIMITE_USO_MINUTOS' } }),
      configRepo.findOne({ where: { chave: 'ALERTA_AMARELO_PERCENTUAL' } }),
      configRepo.findOne({ where: { chave: 'SLA_ATIVO' } }),
    ]);

    const resultado = {
      ativo: cfgAtivo ? cfgAtivo.valor.toLowerCase() === 'true' : false,
      limiteMinutos: cfgLimite ? Number(cfgLimite.valor) : 480,
      alertaPercentual: cfgAlerta ? Number(cfgAlerta.valor) : 80,
    };

    this.slaCache = { ...resultado, timestamp: now };
    return resultado;
  }

  public static async retirada({
    matricula,
    patrimonio,
    operadorId,
    crachaOperador,
  }: RetiradaDTO): Promise<Movimentacao> {
    const patLimpo = String(patrimonio || '').trim();
    if (!/^[0-9]{7}$/.test(patLimpo)) {
      throw new AppError('O patrimônio do coletor deve conter exatamente 7 dígitos numéricos.', 400, 'FORMATO_PATRIMONIO_INVALIDO');
    }

    // 1. Identifica o monitor liberador responsável (sem criar usuário na whitelist)
    let operadorSaidaId = operadorId;
    let matriculaOperadorLiberador: number | null = null;
    if (crachaOperador) {
      const opLiberador = await ColaboradoresService.validarMonitorPorCracha(crachaOperador);
      if (opLiberador.id) {
        operadorSaidaId = opLiberador.id;
      }
      matriculaOperadorLiberador = opLiberador.matricula;
    }

    // 2. Valida elegibilidade do colaborador e trava de custódia diretamente pela matrícula
    const colaborador = await ColaboradoresService.validarPorMatricula(Number(matricula));

    // 3. Regra de integridade: monitor e colaborador não podem ser a mesma pessoa física
    if (matriculaOperadorLiberador && matriculaOperadorLiberador === colaborador.matricula) {
      throw new AppError(
        'O monitor responsável pela liberação não pode ser o mesmo colaborador que está retirando o coletor.',
        400,
        'MESMO_OPERADOR_E_COLABORADOR'
      );
    }

    // 4. Transação atômica com lock pessimista
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const coletor = await queryRunner.manager.findOne(Coletor, {
        where: { patrimonio: patLimpo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!coletor) {
        throw new AppError('Coletor não encontrado no inventário.', 404, 'COLETOR_NAO_ENCONTRADO');
      }

      if (coletor.status === 'EM_USO') {
        throw new AppError('Este coletor já está em uso por outro colaborador.', 409, 'COLETOR_EM_USO');
      }

      if (coletor.status === 'MANUTENCAO') {
        throw new AppError(`Coletor indisponível por manutenção: ${coletor.motivoManutencao || 'Defeito técnico'}`, 409, 'COLETOR_EM_MANUTENCAO');
      }

      if (coletor.status === 'INATIVO') {
        throw new AppError('Este coletor está inativo no inventário permanente.', 409, 'COLETOR_INATIVO');
      }

      // Registra a movimentação
      const movimentacao = queryRunner.manager.create(Movimentacao, {
        coletorId: coletor.id,
        matriculaColaborador: colaborador.matricula,
        nomeColaborador: colaborador.nome,
        setorColaborador: colaborador.setor,
        operadorSaidaId,
        dataSaida: new Date(),
      });
      await queryRunner.manager.save(movimentacao);

      // Atualiza status do coletor
      coletor.status = 'EM_USO';
      await queryRunner.manager.save(coletor);

      await queryRunner.commitTransaction();

      movimentacao.coletor = coletor;
      return movimentacao;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  public static async buscarAtivaPorColaborador(identificadorRaw: string): Promise<any> {
    // 1. Busca colaborador na base corporativa com algoritmo otimizado e resiliente
    const colab = await ColaboradoresService.buscarColaboradorCorporativo(identificadorRaw);
    const matricula = colab.matricula;

    // 2. Busca custódia aberta na tabela movimentacoes
    const movRepo = AppDataSource.getRepository(Movimentacao);
    const mov = await movRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.coletor', 'c')
      .innerJoinAndSelect('m.operadorSaida', 'op')
      .where('m.matriculaColaborador = :matricula AND m.dataRetorno IS NULL', { matricula })
      .getOne();

    if (!mov) {
      throw new AppError(
        `O colaborador ${colab.nome} (Matrícula: ${matricula}) não possui nenhum coletor em aberto no momento.`,
        404,
        'NENHUMA_CUSTODIA_ABERTA'
      );
    }

    const { ativo: slaAtivo, limiteMinutos, alertaPercentual } = await this.obterLimitesSLA();
    const minutosEmUso = Math.floor((Date.now() - new Date(mov.dataSaida).getTime()) / 60000);
    const limiarAlerta = (limiteMinutos * alertaPercentual) / 100;

    let statusSLA: 'NORMAL' | 'ALERTA' | 'EXCEDIDO' = 'NORMAL';
    if (slaAtivo) {
      if (minutosEmUso >= limiteMinutos) {
        statusSLA = 'EXCEDIDO';
      } else if (minutosEmUso >= limiarAlerta) {
        statusSLA = 'ALERTA';
      }
    }

    const horas = Math.floor(minutosEmUso / 60);
    const mins = minutosEmUso % 60;
    const tempoFormatado = `${horas}h ${mins.toString().padStart(2, '0')}m`;

    return {
      movimentacaoId: mov.id,
      coletorId: mov.coletorId,
      patrimonio: mov.coletor.patrimonio,
      modelo: mov.coletor.modelo,
      marca: mov.coletor.marca,
      numeroSerie: mov.coletor.numeroSerie,
      colaborador: {
        matricula: mov.matriculaColaborador,
        nome: mov.nomeColaborador,
        setor: mov.setorColaborador,
        funcao: colab.funcao,
      },
      operadorSaida: {
        nome: mov.operadorSaida.nome,
      },
      dataSaida: mov.dataSaida,
      minutosEmUso,
      tempoFormatado,
      statusSLA,
      limiteMinutos,
    };
  }

  public static async buscarAtivaPorPatrimonio(patrimonioRaw: string): Promise<any> {
    const patrimonio = String(patrimonioRaw || '').trim();
    if (!/^[0-9]{7}$/.test(patrimonio)) {
      throw new AppError('Patrimônio inválido. Deve conter 7 dígitos numéricos.', 400, 'FORMATO_PATRIMONIO_INVALIDO');
    }

    const movRepo = AppDataSource.getRepository(Movimentacao);
    const mov = await movRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.coletor', 'c')
      .innerJoinAndSelect('m.operadorSaida', 'op')
      .where('c.patrimonio = :patrimonio AND m.dataRetorno IS NULL', { patrimonio })
      .getOne();

    if (!mov) {
      throw new AppError('Este coletor não possui movimentação em aberto.', 404, 'NENHUMA_CUSTODIA_ABERTA');
    }

    const { ativo: slaAtivo, limiteMinutos, alertaPercentual } = await this.obterLimitesSLA();
    const minutosEmUso = Math.floor((Date.now() - new Date(mov.dataSaida).getTime()) / 60000);
    const limiarAlerta = (limiteMinutos * alertaPercentual) / 100;

    let statusSLA: 'NORMAL' | 'ALERTA' | 'EXCEDIDO' = 'NORMAL';
    if (slaAtivo) {
      if (minutosEmUso >= limiteMinutos) {
        statusSLA = 'EXCEDIDO';
      } else if (minutosEmUso >= limiarAlerta) {
        statusSLA = 'ALERTA';
      }
    }

    const horas = Math.floor(minutosEmUso / 60);
    const mins = minutosEmUso % 60;
    const tempoFormatado = `${horas}h ${mins.toString().padStart(2, '0')}m`;

    return {
      movimentacaoId: mov.id,
      coletorId: mov.coletorId,
      patrimonio: mov.coletor.patrimonio,
      modelo: mov.coletor.modelo,
      marca: mov.coletor.marca,
      colaborador: {
        matricula: mov.matriculaColaborador,
        nome: mov.nomeColaborador,
        setor: mov.setorColaborador,
      },
      operadorSaida: {
        nome: mov.operadorSaida.nome,
      },
      dataSaida: mov.dataSaida,
      minutosEmUso,
      tempoFormatado,
      statusSLA,
      limiteMinutos,
    };
  }

  public static async devolucao(id: string, dto: DevolucaoDTO): Promise<any> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const mov = await queryRunner.manager.findOne(Movimentacao, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!mov || mov.dataRetorno !== null) {
        throw new AppError('Movimentação não encontrada ou já encerrada.', 404, 'MOVIMENTACAO_JA_ENCERRADA');
      }

      const coletor = await queryRunner.manager.findOne(Coletor, {
        where: { id: mov.coletorId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!coletor) {
        throw new AppError('Coletor associado não encontrado.', 404, 'COLETOR_NAO_ENCONTRADO');
      }

      // 1. Identifica o monitor de retorno responsável (sem criar usuário na whitelist)
      let operadorRetornoId = dto.operadorId;
      if (dto.crachaOperador) {
        const opRecebedor = await ColaboradoresService.validarMonitorPorCracha(dto.crachaOperador);
        if (opRecebedor.id) {
          operadorRetornoId = opRecebedor.id;
        }

        if (opRecebedor.matricula === mov.matriculaColaborador) {
          throw new AppError(
            'O monitor que recebe a devolução não pode ser o mesmo colaborador que estava em posse do coletor.',
            400,
            'MESMO_OPERADOR_E_COLABORADOR'
          );
        }
      }

      const dataRetorno = new Date();
      const minutosUso = Math.max(0, Math.floor((dataRetorno.getTime() - new Date(mov.dataSaida).getTime()) / 60000));

      mov.dataRetorno = dataRetorno;
      mov.operadorRetornoId = operadorRetornoId;
      mov.minutosUso = minutosUso;
      mov.observacaoDevolucao = dto.observacao || (dto.avaria ? dto.motivoManutencao || 'Avaria relatada' : null);
      await queryRunner.manager.save(mov);

      if (dto.avaria) {
        const motivo = dto.motivoManutencao || 'Avaria constatada no retorno';
        const numeroOs = String(dto.numeroOs || '').trim();
        if (!numeroOs) {
          throw new AppError('O número da Ordem de Serviço (OS) do ERP é obrigatório ao registrar avaria/manutenção.', 400, 'OS_OBRIGATORIA');
        }
        if (!/^[0-9]{7}$/.test(numeroOs)) {
          throw new AppError('O número da OS deve conter exatamente 7 dígitos numéricos.', 400, 'FORMATO_OS_INVALIDO');
        }
        coletor.status = 'MANUTENCAO';
        coletor.motivoManutencao = motivo;
        coletor.numeroOs = numeroOs;
        coletor.dataEnvioManutencao = dataRetorno;
        await queryRunner.manager.save(coletor);

        // Registra histórico de manutenção
        const hist = queryRunner.manager.create(HistoricoManutencao, {
          coletorId: coletor.id,
          operadorId: operadorRetornoId,
          motivoEntrada: motivo,
          numeroOs: numeroOs,
          dataEntrada: dataRetorno,
        });
        await queryRunner.manager.save(hist);
      } else {
        coletor.status = 'DISPONIVEL';
        coletor.motivoManutencao = null;
        coletor.numeroOs = null;
        coletor.dataEnvioManutencao = null;
        await queryRunner.manager.save(coletor);
      }

      await queryRunner.commitTransaction();

      return {
        movimentacaoId: mov.id,
        patrimonio: coletor.patrimonio,
        minutosUso,
        statusColetor: coletor.status,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  public static async listarAtivas(): Promise<any[]> {
    const { ativo: slaAtivo, limiteMinutos, alertaPercentual } = await this.obterLimitesSLA();
    const limiarAlerta = (limiteMinutos * alertaPercentual) / 100;

    const movRepo = AppDataSource.getRepository(Movimentacao);
    const ativas = await movRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.coletor', 'c')
      .innerJoinAndSelect('m.operadorSaida', 'op')
      .where('m.dataRetorno IS NULL')
      .orderBy('m.dataSaida', 'ASC')
      .getMany();

    const now = Date.now();

    return ativas.map((m) => {
      const minutosEmUso = Math.floor((now - new Date(m.dataSaida).getTime()) / 60000);
      let statusSLA: 'NORMAL' | 'ALERTA' | 'EXCEDIDO' = 'NORMAL';
      if (slaAtivo) {
        if (minutosEmUso >= limiteMinutos) {
          statusSLA = 'EXCEDIDO';
        } else if (minutosEmUso >= limiarAlerta) {
          statusSLA = 'ALERTA';
        }
      }

      const horas = Math.floor(minutosEmUso / 60);
      const mins = minutosEmUso % 60;

      return {
        id: m.id,
        coletor: {
          id: m.coletor.id,
          patrimonio: m.coletor.patrimonio,
          marca: m.coletor.marca,
          modelo: m.coletor.modelo,
        },
        colaborador: {
          matricula: m.matriculaColaborador,
          nome: m.nomeColaborador,
          setor: m.setorColaborador,
        },
        operadorSaida: {
          id: m.operadorSaida.id,
          nome: m.operadorSaida.nome,
        },
        dataSaida: m.dataSaida,
        minutosEmUso,
        tempoFormatado: `${horas}h ${mins.toString().padStart(2, '0')}m`,
        statusSLA,
        minutosExcedidos: slaAtivo ? Math.max(0, minutosEmUso - limiteMinutos) : 0,
      };
    });
  }

  public static async devolucaoPorColetor(coletorIdOuPatrimonio: string, dto: DevolucaoDTO): Promise<any> {
    const movRepo = AppDataSource.getRepository(Movimentacao);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(coletorIdOuPatrimonio);
    
    const qb = movRepo
      .createQueryBuilder('m')
      .innerJoin('m.coletor', 'c')
      .where('m.dataRetorno IS NULL');

    if (isUuid) {
      qb.andWhere('c.id = :id', { id: coletorIdOuPatrimonio });
    } else {
      qb.andWhere('c.patrimonio = :patrimonio', { patrimonio: coletorIdOuPatrimonio });
    }

    const mov = await qb.getOne();

    if (!mov) {
      throw new AppError('Nenhuma custódia aberta encontrada para este coletor.', 404, 'NENHUMA_CUSTODIA_ABERTA');
    }

    return this.devolucao(mov.id, dto);
  }
}

