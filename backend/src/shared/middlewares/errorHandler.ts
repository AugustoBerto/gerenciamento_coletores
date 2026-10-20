import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      sucesso: false,
      codigo: error.code,
      mensagem: error.message,
      detalhes: error.details,
    });
    return;
  }

  console.error('[Unhandled Error]', error);

  res.status(500).json({
    sucesso: false,
    codigo: 'INTERNAL_SERVER_ERROR',
    mensagem: 'Ocorreu um erro interno no servidor. Contate a equipe de automação/TI.',
  });
};
