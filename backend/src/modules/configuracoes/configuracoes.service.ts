import { ILike } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Operador } from '../../database/entities/Operador';
import { Setor } from '../../database/entities/Setor';
import { Coletor } from '../../database/entities/Coletor';
import { Movimentacao } from '../../database/entities/Movimentacao';
import { HistoricoManutencao } from '../../database/entities/HistoricoManutencao';
import { BloqueioColaborador } from '../../database/entities/BloqueioColaborador';
import { AppError } from '../../shared/errors/AppError';

export interface NovoUsuarioDTO {
  usuario: string;
  matricula: number;
  papel?: 'ADMIN' | 'TI' | 'OPERADOR';
  nome?: string;
  cargo?: string;
}

export interface AtualizarUsuarioDTO {
  papel?: 'ADMIN' | 'TI' | 'OPERADOR';
  ativo?: boolean;
}

export class ConfiguracoesService {
  public static async listarUsuarios(): Promise<Operador[]> {
    const operadorRepo = AppDataSource.getRepository(Operador);
    const usuarios = await operadorRepo.find({
      order: { criadoEm: 'DESC' },
    });
    return usuarios.map((u) => {
      u.senhaHash = null;
      return u;
    });
  }

  public static async consultarUsuarioCorporativo(identificadorRaw: string): Promise<any> {
    const termo = String(identificadorRaw || '').trim();
    if (!termo) {
      throw new AppError('Informe o usuário corporativo ou a matrícula para pesquisa.', 400, 'PARAMETRO_OBRIGATORIO');
    }

    const isNum = /^\d+$/.test(termo);
    const matriculaNum = isNum ? Number(termo) : null;

    // 1. Pesquisa prioritária em autenticacao.usuarios
    const queryAuth = `
      SELECT 
        u.matricula,
        u.usuario,
        u.nome,
        COALESCE(u.funcao, 'Monitor') AS cargo,
        COALESCE(u.setor, 'Almoxarifado') AS setor
      FROM autenticacao.usuarios u
      WHERE ($1::bigint IS NOT NULL AND u.matricula = $1)
         OR ($2::text IS NOT NULL AND LOWER(u.usuario) = LOWER($2))
      LIMIT 1;
    `;

    const resAuth = await AppDataSource.query(queryAuth, [
      matriculaNum,
      isNum ? null : termo,
    ]);

    if (resAuth && resAuth.length > 0) {
      const u = resAuth[0];
      return {
        matricula: Number(u.matricula),
        usuario: String(u.usuario).toLowerCase(),
        nome: u.nome,
        cargo: u.cargo,
        setor: u.setor,
        origem: 'autenticacao',
      };
    }

    // 2. Se não encontrou em autenticacao, pesquisa em colaborador.colaboradores
    const queryColab = `
      SELECT 
        c.matricula,
        c.nome,
        COALESCE(l.nome_setor, 'Setor Operacional') AS setor,
        COALESCE(l.funcao, 'Monitor') AS cargo
      FROM colaborador.colaboradores c
      LEFT JOIN colaborador.lista_funcionario l ON l.matricula = c.matricula
      WHERE ($1::bigint IS NOT NULL AND (c.matricula = $1 OR c.codbarras = $1::bigint))
      LIMIT 1;
    `;

    if (matriculaNum) {
      const resColab = await AppDataSource.query(queryColab, [matriculaNum]);
      if (resColab && resColab.length > 0) {
        const c = resColab[0];
        const nomePartes = String(c.nome).trim().split(' ');
        const usuarioSugerido = `${nomePartes[0]}.${nomePartes[nomePartes.length - 1]}`.toLowerCase();
        return {
          matricula: Number(c.matricula),
          usuario: usuarioSugerido,
          nome: c.nome,
          cargo: c.cargo,
          setor: c.setor,
          origem: 'colaborador',
        };
      }
    }

    throw new AppError(
      'Usuário corporativo ou matrícula não localizada na base da fábrica.',
      404,
      'USUARIO_NAO_ENCONTRADO'
    );
  }

  private static isContaSistemaProtegida(u: Operador): boolean {
    const usuariosFixos = ['suporte.ti', 'monitor.geral'];
    const matriculasFixas = [9999001, 9999002];
    return (
      usuariosFixos.includes(String(u.usuario || '').toLowerCase()) ||
      matriculasFixas.includes(Number(u.matricula))
    );
  }

  public static async cadastrarUsuario(
    dto: NovoUsuarioDTO,
    solicitante?: { id: string; papel: 'ADMIN' | 'TI' | 'OPERADOR' }
  ): Promise<Operador> {
    const usuarioFormatado = String(dto.usuario || '').trim().toLowerCase();
    const matricula = Number(dto.matricula);

    if (!usuarioFormatado || !matricula) {
      throw new AppError('Usuário e matrícula são obrigatórios.', 400, 'CAMPOS_OBRIGATORIOS');
    }

    const papelDesejado = dto.papel || 'OPERADOR';

    // Regra: Apenas usuários de TI podem cadastrar outro TI
    if (papelDesejado === 'TI' && solicitante?.papel !== 'TI') {
      throw new AppError('Apenas usuários do perfil de TI podem cadastrar novos usuários como TI.', 403, 'PERMISSAO_NEGADA_CADASTRO_TI');
    }

    // Regra: Apenas Administradores podem cadastrar Administradores
    if (papelDesejado === 'ADMIN' && solicitante?.papel !== 'ADMIN') {
      throw new AppError('Apenas Administradores podem cadastrar outros Administradores.', 403, 'PERMISSAO_NEGADA_ADMIN');
    }

    const papelAtribuido: 'ADMIN' | 'TI' | 'OPERADOR' = papelDesejado;

    const operadorRepo = AppDataSource.getRepository(Operador);

    const existente = await operadorRepo.findOne({
      where: [{ matricula }, { usuario: usuarioFormatado }],
    });

    if (existente) {
      if (existente.ativo) {
        throw new AppError('Este monitor já está cadastrado e ativo no sistema.', 409, 'OPERADOR_DUPLICADO');
      }
      // Reativa monitor inativo
      existente.ativo = true;
      existente.papel = papelAtribuido;
      if (dto.nome) existente.nome = dto.nome;
      if (dto.cargo) existente.cargo = dto.cargo;
      return operadorRepo.save(existente);
    }

    const novoOperador = operadorRepo.create({
      matricula,
      usuario: usuarioFormatado,
      nome: dto.nome || usuarioFormatado,
      cargo: dto.cargo || 'Monitor',
      papel: papelAtribuido,
      ativo: true,
    });

    return operadorRepo.save(novoOperador);
  }

  public static async atualizarUsuario(
    id: string,
    dto: AtualizarUsuarioDTO,
    solicitante: { id: string; papel: 'ADMIN' | 'TI' | 'OPERADOR' }
  ): Promise<Operador> {
    const operadorRepo = AppDataSource.getRepository(Operador);
    const operador = await operadorRepo.findOne({ where: { id } });

    if (!operador) {
      throw new AppError('Monitor não encontrado.', 404, 'OPERADOR_NAO_ENCONTRADO');
    }

    // Regra: Imutabilidade dos perfis padrão do sistema (suporte.ti e monitor.geral)
    if (this.isContaSistemaProtegida(operador)) {
      if (operador.usuario === 'suporte.ti') {
        if (dto.papel && dto.papel !== 'TI') {
          throw new AppError('O papel do perfil padrão suporte.ti é fixo como TI e não pode ser alterado.', 400, 'PERFIL_TI_FIXO');
        }
        if (dto.ativo === false) {
          throw new AppError('O perfil padrão suporte.ti não pode ser inativado.', 400, 'PERFIL_TI_IMUTAVEL');
        }
      } else {
        if (dto.papel && dto.papel !== 'OPERADOR') {
          throw new AppError('O papel do perfil padrão Monitor Geral é fixo e não pode ser alterado.', 400, 'PERFIL_MONITOR_GERAL_FIXO');
        }
        if (dto.ativo === false) {
          throw new AppError('O perfil padrão Monitor Geral não pode ser inativado.', 400, 'PERFIL_MONITOR_GERAL_IMUTAVEL');
        }
      }
    }

    // Regra: Restrições de atribuição e alteração de papel
    if (dto.papel === 'TI' && solicitante.papel !== 'TI') {
      throw new AppError('Apenas usuários do perfil de TI podem conceder o perfil de TI.', 403, 'PERMISSAO_NEGADA_ATRIBUICAO_TI');
    }

    if (dto.papel === 'ADMIN' && solicitante.papel !== 'ADMIN') {
      throw new AppError('Apenas Administradores podem conceder o perfil de Administrador.', 403, 'PERMISSAO_NEGADA_ADMIN');
    }

    if (solicitante.papel === 'TI') {
      if (operador.papel === 'ADMIN' || (operador.papel === 'TI' && operador.id !== solicitante.id)) {
        throw new AppError('Perfil de TI não tem permissão para alterar Administradores ou outros técnicos de TI.', 403, 'PERMISSAO_NEGADA_TI');
      }
    }

    // Regra RN10: Proteção de Integridade do Administrador
    if (solicitante.id === id) {
      if (dto.ativo === false) {
        throw new AppError('Você não pode inativar seu próprio usuário.', 400, 'AUTO_INATIVACAO_PROIBIDA');
      }
      if (dto.papel && dto.papel !== operador.papel) {
        throw new AppError('Você não pode alterar seu próprio privilégio de acesso.', 400, 'AUTO_ALTERACAO_PROIBIDA');
      }
    }

    if (operador.papel === 'ADMIN' && (dto.ativo === false || dto.papel !== 'ADMIN')) {
      const activeAdmins = await operadorRepo.count({
        where: { papel: 'ADMIN', ativo: true },
      });
      if (activeAdmins <= 1) {
        throw new AppError(
          'Não é permitido inativar ou rebaixar o único Administrador ativo do sistema.',
          400,
          'ULTIMO_ADMIN_PROIBIDO'
        );
      }
    }

    if (dto.papel !== undefined) {
      operador.papel = dto.papel;
    }

    if (dto.ativo !== undefined) {
      operador.ativo = dto.ativo;
    }

    return operadorRepo.save(operador);
  }

  public static async excluirUsuario(
    id: string,
    solicitante: { id: string; papel: 'ADMIN' | 'TI' | 'OPERADOR' }
  ): Promise<{ mensagem: string }> {
    const operadorRepo = AppDataSource.getRepository(Operador);
    const operador = await operadorRepo.findOne({ where: { id } });

    if (!operador) {
      throw new AppError('Monitor não encontrado.', 404, 'OPERADOR_NAO_ENCONTRADO');
    }

    if (this.isContaSistemaProtegida(operador)) {
      throw new AppError(
        'Os perfis padrão do sistema (Monitor Geral e Suporte TI) são protegidos e não podem ser excluídos.',
        400,
        'PERFIL_SISTEMA_PROTEGIDO'
      );
    }

    if (solicitante.id === id) {
      throw new AppError('Você não pode excluir seu próprio usuário.', 400, 'AUTO_EXCLUSAO_PROIBIDA');
    }

    if (solicitante.papel === 'TI') {
      if (operador.papel === 'ADMIN' || operador.papel === 'TI') {
        throw new AppError(
          'Perfil de TI não tem permissão para excluir Administradores ou outros técnicos de TI.',
          403,
          'PERMISSAO_NEGADA_TI'
        );
      }
    }

    if (solicitante.papel === 'ADMIN' && operador.papel === 'TI') {
      throw new AppError(
        'Administradores não podem excluir usuários do perfil de TI.',
        403,
        'PERMISSAO_NEGADA_ADMIN_TI'
      );
    }

    if (operador.papel === 'ADMIN' && operador.ativo) {
      const activeAdmins = await operadorRepo.count({
        where: { papel: 'ADMIN', ativo: true },
      });
      if (activeAdmins <= 1) {
        throw new AppError(
          'Não é permitido excluir o único Administrador ativo do sistema.',
          400,
          'ULTIMO_ADMIN_PROIBIDO'
        );
      }
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Localiza conta de sistema (Monitor Geral ou Suporte TI) para preservar integridade referencial de históricos
      const contaFallback = await queryRunner.manager.findOne(Operador, {
        where: [
          { matricula: 9999002 },
          { usuario: 'monitor.geral' },
          { matricula: 9999001 },
          { usuario: 'suporte.ti' },
        ],
      });

      if (contaFallback && contaFallback.id !== id) {
        await queryRunner.manager.update(
          Movimentacao,
          { operadorSaidaId: id },
          { operadorSaidaId: contaFallback.id }
        );
        await queryRunner.manager.update(
          Movimentacao,
          { operadorRetornoId: id },
          { operadorRetornoId: contaFallback.id }
        );
        await queryRunner.manager.update(
          HistoricoManutencao,
          { operadorId: id },
          { operadorId: contaFallback.id }
        );
        await queryRunner.manager.update(
          BloqueioColaborador,
          { operadorId: id },
          { operadorId: contaFallback.id }
        );
      }

      await queryRunner.manager.delete(Operador, { id });
      await queryRunner.commitTransaction();

      return {
        mensagem: `Monitor "${operador.nome}" (@${operador.usuario}) excluído com sucesso.`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // --- Gestão de Setores ---
  public static async listarSetores(somenteAtivos: boolean = false): Promise<Setor[]> {
    const setorRepo = AppDataSource.getRepository(Setor);
    const where = somenteAtivos ? { ativo: true } : {};
    return setorRepo.find({
      where,
      order: { nome: 'ASC' },
    });
  }

  public static async cadastrarSetor(dto: { nome: string; descricao?: string | null }): Promise<Setor> {
    const nome = String(dto.nome || '').trim();
    if (!nome) {
      throw new AppError('O nome do setor é obrigatório.', 400, 'NOME_SETOR_OBRIGATORIO');
    }
    if (nome.length > 80) {
      throw new AppError('O nome do setor não pode exceder 80 caracteres.', 400, 'NOME_SETOR_MUITO_LONGO');
    }

    const setorRepo = AppDataSource.getRepository(Setor);
    const existente = await setorRepo.findOne({
      where: { nome: ILike(nome) },
    });

    if (existente) {
      if (!existente.ativo) {
        // Se já existia mas estava inativo, reativa e atualiza a descrição se fornecida
        existente.ativo = true;
        if (dto.descricao !== undefined) {
          existente.descricao = dto.descricao ? String(dto.descricao).trim() : null;
        }
        return setorRepo.save(existente);
      }
      throw new AppError('Já existe um setor ativo com este nome.', 409, 'SETOR_DUPLICADO');
    }

    const novo = setorRepo.create({
      nome,
      descricao: dto.descricao ? String(dto.descricao).trim() : null,
      ativo: true,
    });

    return setorRepo.save(novo);
  }

  public static async atualizarSetor(
    id: string,
    dto: { nome?: string; descricao?: string | null; ativo?: boolean }
  ): Promise<Setor> {
    const setorRepo = AppDataSource.getRepository(Setor);
    const setor = await setorRepo.findOne({ where: { id } });

    if (!setor) {
      throw new AppError('Setor não encontrado.', 404, 'SETOR_NAO_ENCONTRADO');
    }

    if (dto.nome !== undefined) {
      const nomeTratado = String(dto.nome || '').trim();
      if (!nomeTratado) {
        throw new AppError('O nome do setor não pode ficar em branco.', 400, 'NOME_SETOR_OBRIGATORIO');
      }
      if (nomeTratado.length > 80) {
        throw new AppError('O nome do setor não pode exceder 80 caracteres.', 400, 'NOME_SETOR_MUITO_LONGO');
      }

      // Verificar se outro setor já tem o mesmo nome
      const outro = await setorRepo.findOne({
        where: { nome: ILike(nomeTratado) },
      });
      if (outro && outro.id !== id) {
        throw new AppError('Já existe outro setor com este nome.', 409, 'SETOR_DUPLICADO');
      }

      setor.nome = nomeTratado;
    }

    if (dto.descricao !== undefined) {
      setor.descricao = dto.descricao ? String(dto.descricao).trim() : null;
    }

    if (dto.ativo !== undefined) {
      setor.ativo = Boolean(dto.ativo);
    }

    return setorRepo.save(setor);
  }

  public static async toggleStatusSetor(id: string): Promise<Setor> {
    const setorRepo = AppDataSource.getRepository(Setor);
    const setor = await setorRepo.findOne({ where: { id } });

    if (!setor) {
      throw new AppError('Setor não encontrado.', 404, 'SETOR_NAO_ENCONTRADO');
    }

    setor.ativo = !setor.ativo;
    return setorRepo.save(setor);
  }

  public static async excluirSetor(id: string): Promise<{ mensagem: string }> {
    const setorRepo = AppDataSource.getRepository(Setor);
    const coletorRepo = AppDataSource.getRepository(Coletor);

    const setor = await setorRepo.findOne({ where: { id } });
    if (!setor) {
      throw new AppError('Setor não encontrado.', 404, 'SETOR_NAO_ENCONTRADO');
    }

    // Desvincula os coletores vinculados antes da exclusão
    const coletoresVinculados = await coletorRepo.count({ where: { setorId: id } });
    if (coletoresVinculados > 0) {
      await coletorRepo.update({ setorId: id }, { setorId: null });
    }

    await setorRepo.delete(id);
    return { mensagem: `Setor "${setor.nome}" excluído com sucesso.` };
  }
}
