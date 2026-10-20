import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';
import { AppDataSource } from '../../config/database';
import { Operador } from '../../database/entities/Operador';

export interface OperadorPayload {
  id: string;
  matricula: number;
  usuario: string;
  nome: string;
  papel: 'ADMIN' | 'TI' | 'OPERADOR';
}

declare global {
  namespace Express {
    interface Request {
      operador?: OperadorPayload;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;
    const token = tokenFromHeader || req.cookies?.token;

    if (!token) {
      throw new AppError('Token de autenticação não fornecido.', 401, 'AUTH_TOKEN_REQUIRED');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('Configuração de JWT indisponível no servidor.', 500, 'JWT_SECRET_MISSING');
    }

    const decoded = jwt.verify(token, jwtSecret, { clockTolerance: 120 }) as any;

    const matricula = Number(decoded.matricula);
    const usuario = String(decoded.usuario || decoded.username || '').toLowerCase();

    const operadorRepo = AppDataSource.getRepository(Operador);
    let operador = await operadorRepo.findOne({
      where: matricula ? { matricula } : { usuario },
    });

    if (!operador) {
      throw new AppError('Operador não cadastrado ou não sincronizado.', 401, 'OPERADOR_NAO_ENCONTRADO');
    }

    if (!operador.ativo) {
      throw new AppError('Acesso suspenso para este operador.', 403, 'OPERADOR_INATIVO');
    }

    req.operador = {
      id: operador.id,
      matricula: operador.matricula,
      usuario: operador.usuario,
      nome: operador.nome,
      papel: operador.papel,
    };

    next();
  } catch (err: any) {
    if (err instanceof AppError) {
      next(err);
      return;
    }

    if (err.name === 'TokenExpiredError') {
      next(new AppError('Sessão expirada. Utilize o token de renovação.', 401, 'AUTH_TOKEN_EXPIRED'));
      return;
    }

    next(new AppError('Token de autenticação inválido.', 401, 'AUTH_TOKEN_INVALID'));
  }
};

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.operador?.papel !== 'ADMIN') {
    next(new AppError('Acesso restrito a Administradores.', 403, 'ACESSO_NEGADO_ADMIN'));
    return;
  }
  next();
};

export const requireTI = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.operador?.papel !== 'ADMIN' && req.operador?.papel !== 'TI') {
    next(new AppError('Acesso restrito ao perfil de TI e Administradores.', 403, 'ACESSO_NEGADO_TI'));
    return;
  }
  next();
};

export const requireStrictTI = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.operador?.papel !== 'TI') {
    next(new AppError('Acesso restrito exclusivamente ao perfil técnico de TI.', 403, 'ACESSO_EXCLUSIVO_TI'));
    return;
  }
  next();
};

