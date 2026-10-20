import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { usuario, senha } = req.body;
      if (!usuario || !senha) {
        res.status(400).json({
          sucesso: false,
          codigo: 'DADOS_OBRIGATORIOS',
          mensagem: 'Informe o usuário e senha para acessar o sistema.',
        });
        return;
      }

      const result = await AuthService.login(String(usuario).trim(), String(senha));

      if (result.cookies.length > 0) {
        res.setHeader('Set-Cookie', result.cookies);
      }

      res.status(200).json({
        sucesso: true,
        mensagem: 'Login efetuado com sucesso.',
        dados: {
          token: result.token,
          usuario: result.operador,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        sucesso: true,
        dados: req.operador,
      });
    } catch (err) {
      next(err);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cookieHeader = req.headers.cookie;
      const authHeader = req.headers.authorization;
      const result = await AuthService.refresh(cookieHeader, authHeader);

      if (result.cookies.length > 0) {
        res.setHeader('Set-Cookie', result.cookies);
      }

      res.status(200).json({
        sucesso: true,
        dados: { token: result.token },
      });
    } catch (err) {
      next(err);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cookieHeader = req.headers.cookie;
      const result = await AuthService.logout(cookieHeader);

      if (result.cookies.length > 0) {
        res.setHeader('Set-Cookie', result.cookies);
      }

      res.status(200).json({
        sucesso: true,
        mensagem: 'Sessão encerrada com sucesso.',
      });
    } catch (err) {
      next(err);
    }
  }
}
