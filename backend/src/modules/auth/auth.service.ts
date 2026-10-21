import axios, { AxiosError } from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../config/database';
import { Operador } from '../../database/entities/Operador';
import { AppError } from '../../shared/errors/AppError';

export class AuthService {
  private static getDassAuthUrl(): string {
    let url = process.env.DASS_AUTH_URL;
    if (!url) {
      throw new AppError('DASS_AUTH_URL não configurada no backend.', 500, 'DASS_AUTH_URL_MISSING');
    }
    url = url.trim().replace(/\/+$/, '');
    if (url.includes(':2399') && !url.endsWith('/api')) {
      url = `${url}/api`;
    }
    return url;
  }

  public static async assegurarSuporteTI(): Promise<void> {
    try {
      const operadorRepo = AppDataSource.getRepository(Operador);
      const suporteExistente = await operadorRepo.findOne({
        where: [{ usuario: 'suporte.ti' }, { matricula: 9999001 }],
      });

      const hash = await bcrypt.hash('gdti5s11se', 10);

      if (!suporteExistente) {
        const novoSuporte = operadorRepo.create({
          matricula: 9999001,
          usuario: 'suporte.ti',
          nome: 'Suporte TI',
          cargo: 'Técnico de TI',
          papel: 'TI',
          ativo: true,
          senhaHash: hash,
        });
        await operadorRepo.save(novoSuporte);
        console.log('[Auth] Perfil padrão suporte.ti criado com sucesso no schema gestao_coletores.');
      } else {
        let precisaSalvar = false;
        if (suporteExistente.papel !== 'TI') {
          suporteExistente.papel = 'TI';
          precisaSalvar = true;
        }
        if (!suporteExistente.senhaHash) {
          suporteExistente.senhaHash = hash;
          precisaSalvar = true;
        }
        if (!suporteExistente.ativo) {
          suporteExistente.ativo = true;
          precisaSalvar = true;
        }
        if (precisaSalvar) {
          await operadorRepo.save(suporteExistente);
          console.log('[Auth] Perfil suporte.ti atualizado com sucesso.');
        }
      }
    } catch (err) {
      console.error('[Auth] Falha ao assegurar criação do suporte.ti:', err);
    }
  }

  public static async login(usuario: string, senha: string): Promise<{
    token: string;
    operador: {
      id: string;
      matricula: number;
      usuario: string;
      nome: string;
      papel: string;
    };
    cookies: string[];
  }> {
    const usuarioFormatado = String(usuario).trim().toLowerCase();
    const matriculaNum = /^\d+$/.test(usuario.trim()) ? Number(usuario.trim()) : null;

    const operadorRepo = AppDataSource.getRepository(Operador);

    // 1. Verificação de Autenticação Local (RBAC local gestao_coletores, ex: suporte.ti)
    const operadorLocal = await operadorRepo.findOne({
      where: matriculaNum
        ? [{ matricula: matriculaNum }, { usuario: usuarioFormatado }]
        : { usuario: usuarioFormatado },
    });

    if (operadorLocal && operadorLocal.senhaHash) {
      const senhaValida = await bcrypt.compare(senha, operadorLocal.senhaHash);
      if (!senhaValida) {
        throw new AppError('Usuário ou senha incorretos.', 401, 'CREDENCIAS_INVALIDAS');
      }

      if (!operadorLocal.ativo) {
        throw new AppError('O acesso deste operador ao sistema de coletores está inativo. Contate o Administrador.', 403, 'OPERADOR_INATIVO');
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new AppError('Configuração de JWT indisponível no servidor.', 500, 'JWT_SECRET_MISSING');
      }

      const token = jwt.sign(
        {
          id: operadorLocal.id,
          matricula: operadorLocal.matricula,
          usuario: operadorLocal.usuario,
          nome: operadorLocal.nome,
          papel: operadorLocal.papel,
        },
        jwtSecret,
        { expiresIn: '8h' }
      );

      return {
        token,
        operador: {
          id: operadorLocal.id,
          matricula: operadorLocal.matricula,
          usuario: operadorLocal.usuario,
          nome: operadorLocal.nome,
          papel: operadorLocal.papel,
        },
        cookies: [],
      };
    }

    // 2. Autenticação Corporativa via DASS SSO
    const authUrl = this.getDassAuthUrl();

    let authResponse: any;
    try {
      authResponse = await axios.post(
        `${authUrl}/auth/login`,
        { usuario, senha },
        { timeout: 8000 }
      );
    } catch (err: any) {
      const axiosError = err as AxiosError;
      if (axiosError.response?.status === 401) {
        throw new AppError('Usuário ou senha corporativa incorretos.', 401, 'CREDENCIAS_INVALIDAS');
      }
      throw new AppError('Serviço de autenticação corporativo (DASS SSO) temporariamente indisponível.', 503, 'AUTH_SERVICE_UNAVAILABLE');
    }

    const token =
      authResponse.data?.data?.token ||
      authResponse.data?.token ||
      authResponse.data?.accessToken;

    if (!token) {
      throw new AppError('Token de sessão não retornado pelo serviço corporativo.', 502, 'AUTH_TOKEN_MISSING');
    }

    const jwtSecret = process.env.JWT_SECRET || '';
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret, { clockTolerance: 120 });
    } catch (jwtErr) {
      throw new AppError('Falha ao validar assinatura do token emitido pelo SSO corporativo.', 401, 'AUTH_SIGNATURE_INVALID');
    }

    const matricula = Number(decoded.matricula || authResponse.data?.data?.matricula);
    const username = String(decoded.usuario || decoded.username || usuario).toLowerCase();
    const nome = String(decoded.nome || authResponse.data?.data?.nome || 'Operador Almoxarifado');
    const cargo = String(decoded.funcao || authResponse.data?.data?.funcao || '');

    const totalAdminsAtivos = await operadorRepo.count({ where: { papel: 'ADMIN', ativo: true } });

    let operador = await operadorRepo.findOne({
      where: matricula ? { matricula } : { usuario: username },
    });

    if (totalAdminsAtivos === 0) {
      // Regra RN08: Primeiro Acesso (Bootstrap do Administrador Geral)
      if (operador) {
        operador.papel = 'ADMIN';
        operador.ativo = true;
        operador.nome = nome;
        operador.cargo = cargo || operador.cargo;
        operador.usuario = username;
        operador = await operadorRepo.save(operador);
      } else {
        operador = operadorRepo.create({
          matricula,
          usuario: username,
          nome,
          cargo,
          papel: 'ADMIN',
          ativo: true,
        });
        operador = await operadorRepo.save(operador);
      }
    } else {
      // Regra RN09: Whitelist Estrita de Operadores Cadastrados
      if (!operador) {
        throw new AppError(
          'Acesso não autorizado. Seu usuário corporativo não está cadastrado no Sistema de Coletores. Solicite liberação a um Administrador.',
          403,
          'USUARIO_NAO_AUTORIZADO'
        );
      }

      if (!operador.ativo) {
        throw new AppError(
          'O acesso deste operador ao sistema de coletores está inativo. Contate o Administrador.',
          403,
          'OPERADOR_INATIVO'
        );
      }

      // Atualiza snapshot de dados corporativos
      operador.nome = nome;
      operador.cargo = cargo || operador.cargo;
      operador.usuario = username;
      operador = await operadorRepo.save(operador);
    }

    const cookies = authResponse.headers['set-cookie'] || [];

    return {
      token,
      operador: {
        id: operador.id,
        matricula: operador.matricula,
        usuario: operador.usuario,
        nome: operador.nome,
        papel: operador.papel,
      },
      cookies: Array.isArray(cookies) ? cookies : [cookies],
    };
  }

  public static async refresh(cookieHeader?: string, authHeader?: string): Promise<{ token: string; cookies: string[] }> {
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const jwtSecret = process.env.JWT_SECRET || '';

    if (tokenFromHeader && jwtSecret) {
      try {
        const decoded = jwt.verify(tokenFromHeader, jwtSecret, { ignoreExpiration: true }) as any;
        const operadorRepo = AppDataSource.getRepository(Operador);
        const matricula = Number(decoded.matricula);
        const usuario = String(decoded.usuario || '').toLowerCase();
        const operadorLocal = await operadorRepo.findOne({
          where: matricula ? { matricula } : { usuario },
        });

        if (operadorLocal && operadorLocal.senhaHash && operadorLocal.ativo) {
          const newToken = jwt.sign(
            {
              id: operadorLocal.id,
              matricula: operadorLocal.matricula,
              usuario: operadorLocal.usuario,
              nome: operadorLocal.nome,
              papel: operadorLocal.papel,
            },
            jwtSecret,
            { expiresIn: '8h' }
          );
          return { token: newToken, cookies: [] };
        }
      } catch {
        // Prossegue para refresh do SSO corporativo se não for usuário local válido
      }
    }

    const authUrl = this.getDassAuthUrl();
    try {
      const response = await axios.post(
        `${authUrl}/auth/me`,
        {},
        {
          headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
          timeout: 5000,
        }
      );

      const token = response.data?.data?.token || response.data?.token;
      if (!token) {
        throw new AppError('Não foi possível renovar a sessão corporativa.', 401, 'AUTH_REFRESH_FAILED');
      }

      const cookies = response.headers['set-cookie'] || [];
      return { token, cookies: Array.isArray(cookies) ? cookies : [cookies] };
    } catch {
      throw new AppError('Sessão expirada. Efetue login novamente.', 401, 'AUTH_SESSION_EXPIRED');
    }
  }

  public static async logout(cookieHeader?: string): Promise<{ cookies: string[] }> {
    const authUrl = this.getDassAuthUrl();
    try {
      const response = await axios.post(
        `${authUrl}/auth/logout`,
        {},
        {
          headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
          timeout: 5000,
          validateStatus: () => true,
        }
      );
      const cookies = response.headers['set-cookie'] || [];
      return { cookies: Array.isArray(cookies) ? cookies : [cookies] };
    } catch {
      return { cookies: [] };
    }
  }
}
