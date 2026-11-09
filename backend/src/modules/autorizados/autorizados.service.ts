import { AppDataSource } from '../../config/database';
import { AutorizadoLiberacao } from '../../database/entities/AutorizadoLiberacao';
import { Operador } from '../../database/entities/Operador';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { AppError } from '../../shared/errors/AppError';

export class AutorizadosService {
  public static async listar(): Promise<AutorizadoLiberacao[]> {
    const repo = AppDataSource.getRepository(AutorizadoLiberacao);
    return repo.find({
      relations: { criadoPor: true },
      order: { nome: 'ASC' },
    });
  }

  public static async consultarColaborador(identificadorRaw: string): Promise<{
    matricula: number;
    nome: string;
    setor: string;
    funcao: string;
    jaEhUsuario: boolean;
    usuario?: string;
    jaAutorizado: boolean;
  }> {
    const colab = await ColaboradoresService.consultarColaboradorParaTitular(identificadorRaw);

    const operadorRepo = AppDataSource.getRepository(Operador);
    const operador = await operadorRepo.findOne({
      where: { matricula: colab.matricula },
    });

    const autorizadoRepo = AppDataSource.getRepository(AutorizadoLiberacao);
    const autorizado = await autorizadoRepo.findOne({
      where: { matricula: colab.matricula },
    });

    return {
      matricula: colab.matricula,
      nome: colab.nome,
      setor: colab.setor,
      funcao: colab.funcao,
      jaEhUsuario: Boolean(operador && operador.ativo),
      usuario: operador?.usuario,
      jaAutorizado: Boolean(autorizado),
    };
  }

  public static async adicionar(
    identificadorRaw: string,
    criadoPorId?: string | null
  ): Promise<AutorizadoLiberacao> {
    const colab = await ColaboradoresService.consultarColaboradorParaTitular(identificadorRaw);

    // 1. Verifica se já é usuário ativo no sistema
    const operadorRepo = AppDataSource.getRepository(Operador);
    const operador = await operadorRepo.findOne({
      where: { matricula: colab.matricula },
    });

    if (operador && operador.ativo) {
      throw new AppError(
        `O colaborador ${colab.nome} (Matrícula: ${colab.matricula}) já possui perfil de usuário ativo no sistema (${operador.usuario}) e já está autorizado automaticamente.`,
        409,
        'COLABORADOR_JA_E_USUARIO'
      );
    }

    // 2. Verifica se já está na lista de autorizados
    const autorizadoRepo = AppDataSource.getRepository(AutorizadoLiberacao);
    const existente = await autorizadoRepo.findOne({
      where: { matricula: colab.matricula },
    });

    if (existente) {
      throw new AppError(
        `O colaborador ${colab.nome} já consta na lista de pessoas autorizadas a liberar coletores.`,
        409,
        'COLABORADOR_JA_AUTORIZADO'
      );
    }

    const novo = autorizadoRepo.create({
      matricula: colab.matricula,
      nome: colab.nome,
      codbarras: colab.codbarras || null,
      rfid: colab.rfid || null,
      setor: colab.setor,
      funcao: colab.funcao,
      criadoPorId: criadoPorId || null,
    });

    return autorizadoRepo.save(novo);
  }

  public static async remover(id: string): Promise<void> {
    const autorizadoRepo = AppDataSource.getRepository(AutorizadoLiberacao);
    const registro = await autorizadoRepo.findOne({ where: { id } });

    if (!registro) {
      throw new AppError('Registro de autorização não encontrado.', 404, 'AUTORIZADO_NAO_ENCONTRADO');
    }

    await autorizadoRepo.remove(registro);
  }
}
