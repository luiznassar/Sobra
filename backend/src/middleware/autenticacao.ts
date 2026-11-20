import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { SESSION_COOKIE, validarSessao, validarOrigemMutacao } from "../auth";

export async function exigirAutenticacao(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string" || !token) {
      res.status(401).json({ erro: "Autenticação necessária." });
      return;
    }

    const sessao = await validarSessao(token);
    if (!sessao) {
      res.status(401).json({ erro: "Sessão inválida ou expirada." });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: sessao.sub },
      include: { empresa: true },
    });

    if (!usuario || usuario.empresaId !== sessao.empresaId) {
      res.status(401).json({ erro: "Sessão inválida." });
      return;
    }

    req.usuarioAutenticado = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
      empresaNome: usuario.empresa.nome,
      csrf: sessao.csrf,
    };

    validarOrigemMutacao(req, res, next);
  } catch (erro) {
    console.error("Erro ao validar autenticação:", erro);
    res.status(500).json({ erro: "Não foi possível validar a sessão." });
  }
}
