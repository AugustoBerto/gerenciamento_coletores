import { AppDataSource } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { Coletor, StatusColetor } from '../../database/entities/Coletor';
import { HistoricoManutencao } from '../../database/entities/HistoricoManutencao';

export interface CriarColetorDTO {
  patrimonio: string;
  numeroSerie?: string | null;
  marca: string;
  modelo: string;
}

export interface AtualizarColetorDTO {
  numeroSerie?: string | null;
  marca?: string;
  modelo?: string;
}

export class ColetoresService {
  public static async listar(filtros: {
    busca?: string;
    status?: StatusColetor;
    page?: number;
    limit?: number;
  }): Promise<{ coletores: Coletor[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.min(100, Math.max(1, filtros.limit || 20));
    const skip = (page - 1) * limit;

    const repo = AppDataSource.getRepository(Coletor);
    const query = repo.createQueryBuilder('c');

    if (filtros.status) {
      query.andWhere('c.status = :status', { status: filtros.status });
    }

    if (filtros.busca) {
      const termo = `%${filtros.busca.trim()}%`;
      query.andWhere(
        '(c.patrimonio ILIKE :termo OR c.numero_serie ILIKE :termo OR c.marca ILIKE :termo OR c.modelo ILIKE :termo)',
        { termo }
      );
    }

    query.orderBy('c.patrimonio', 'ASC').skip(skip).take(limit);

    const [coletores, total] = await query.getManyAndCount();

    return {
      coletores,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public static async buscarPorId(id: string): Promise<Coletor> {
    const repo = AppDataSource.getRepository(Coletor);
    const coletor = await repo.findOne({
      where: { id },
      relations: {
        historicoManutencoes: { operador: true },
      },
    });

    if (!coletor) {
      throw new AppError('Coletor não encontrado.', 404, 'COLETOR_NAO_ENCONTRADO');
    }

    return coletor;
  }

  public static async criar(dto: CriarColetorDTO): Promise<Coletor> {
    const patrimonio = String(dto.patrimonio || '').trim();
    if (!/^[0-9]{7}$/.test(patrimonio)) {
      throw new AppError('O patrimônio deve conter exatamente 7 dígitos numéricos.', 400, 'FORMATO_PATRIMONIO_INVALIDO');
    }

    const repo = AppDataSource.getRepository(Coletor);
    const existe = await repo.findOne({ where: { patrimonio } });
    if (existe) {
      throw new AppError('Já existe um coletor cadastrado com este patrimônio.', 409, 'PATRIMONIO_DUPLICADO');
    }

    const coletor = repo.create({
      patrimonio,
      numeroSerie: dto.numeroSerie ? String(dto.numeroSerie).trim() : null,
      marca: String(dto.marca).trim(),
      modelo: String(dto.modelo).trim(),
      status: 'DISPONIVEL',
    });

    return repo.save(coletor);
  }

  public static async atualizar(id: string, dto: AtualizarColetorDTO): Promise<Coletor> {
    const repo = AppDataSource.getRepository(Coletor);
    const coletor = await this.buscarPorId(id);

    if (dto.numeroSerie !== undefined) {
      coletor.numeroSerie = dto.numeroSerie ? String(dto.numeroSerie).trim() : null;
    }
    if (dto.marca) {
      coletor.marca = String(dto.marca).trim();
    }
    if (dto.modelo) {
      coletor.modelo = String(dto.modelo).trim();
    }

    return repo.save(coletor);
  }

  public static async enviarManutencao(id: string, motivo: string, operadorId: string, numeroOs: string): Promise<Coletor> {
    const coletor = await this.buscarPorId(id);

    if (coletor.status === 'EM_USO') {
      throw new AppError('Não é possível enviar para manutenção um coletor em uso ativo. Realize a devolução primeiro.', 409, 'COLETOR_EM_USO');
    }

    const osTratada = String(numeroOs || '').trim();
    if (!osTratada) {
      throw new AppError('O número da Ordem de Serviço (OS) do ERP é obrigatório.', 400, 'OS_OBRIGATORIA');
    }
    if (!/^[0-9]{7}$/.test(osTratada)) {
      throw new AppError('O número da OS deve conter exatamente 7 dígitos numéricos.', 400, 'FORMATO_OS_INVALIDO');
    }

    const motivoTratado = String(motivo || '').trim();
    if (!motivoTratado) {
      throw new AppError('O motivo da manutenção é obrigatório.', 400, 'MOTIVO_OBRIGATORIO');
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dataEnvio = new Date();
      coletor.status = 'MANUTENCAO';
      coletor.motivoManutencao = motivoTratado;
      coletor.numeroOs = osTratada;
      coletor.dataEnvioManutencao = dataEnvio;
      await queryRunner.manager.save(coletor);

      const hist = queryRunner.manager.create(HistoricoManutencao, {
        coletorId: coletor.id,
        operadorId,
        motivoEntrada: motivoTratado,
        numeroOs: osTratada,
        dataEntrada: dataEnvio,
      });
      await queryRunner.manager.save(hist);

      await queryRunner.commitTransaction();
      return coletor;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  public static async concluirManutencao(id: string, solucao: string, _operadorId: string): Promise<Coletor> {
    const coletor = await this.buscarPorId(id);

    if (coletor.status !== 'MANUTENCAO') {
      throw new AppError('Este coletor não está com status de manutenção.', 400, 'STATUS_INVALIDO');
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const histRepo = queryRunner.manager.getRepository(HistoricoManutencao);
      const ultimoHist = await histRepo.findOne({
        where: { coletorId: coletor.id, dataConclusao: undefined as any },
        order: { dataEntrada: 'DESC' },
      });

      if (ultimoHist && !ultimoHist.dataConclusao) {
        ultimoHist.dataConclusao = new Date();
        ultimoHist.solucaoSaida = solucao;
        await queryRunner.manager.save(ultimoHist);
      }

      coletor.status = 'DISPONIVEL';
      coletor.motivoManutencao = null;
      coletor.numeroOs = null;
      coletor.dataEnvioManutencao = null;
      await queryRunner.manager.save(coletor);

      await queryRunner.commitTransaction();
      return coletor;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  public static async inativar(id: string): Promise<Coletor> {
    const coletor = await this.buscarPorId(id);
    if (coletor.status === 'EM_USO') {
      throw new AppError('Não é possível inativar um coletor que está sob custódia de um colaborador.', 409, 'COLETOR_EM_USO');
    }

    coletor.status = 'INATIVO';
    const repo = AppDataSource.getRepository(Coletor);
    return repo.save(coletor);
  }
}
