import { randomBytes, randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sobra_session";

export class SessionConfigurationError extends Error {}

let developmentSessionSecret: Uint8Array | null = null;

export type SessaoPayload = {
  sub: string;
  empresaId: string;
  csrf: string;
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new SessionConfigurationError("Sessão não configurada.");
    }

    developmentSessionSecret ??= randomBytes(32);
    return developmentSessionSecret;
  }
  if (secret.length < 32) {
    throw new SessionConfigurationError("Sessão não configurada corretamente.");
  }
  return new TextEncoder().encode(secret);
}

export async function criarSessao(usuarioId: string, empresaId: string): Promise<{
  token: string;
  csrfToken: string;
}> {
  const csrfToken = randomUUID();
  const token = await new SignJWT({ empresaId, csrf: csrfToken })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSessionSecret());

  return { token, csrfToken };
}

export async function validarSessao(token: string): Promise<SessaoPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.empresaId !== "string" ||
      typeof payload.csrf !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      empresaId: payload.empresaId,
      csrf: payload.csrf,
    };
  } catch {
    return null;
  }
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export function limparSessao(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
}

export function validarOrigemMutacao(req: Request, res: Response, next: NextFunction) {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origensPermitidas = (
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000")
    )
      .split(/[;,]/)
      .map((origem) => origem.trim())
      .filter(Boolean);
    const origem = req.get("origin");

    if (origem && !origensPermitidas.includes(origem)) {
      res.status(403).json({ erro: "Origem da requisição não autorizada." });
      return;
    }

    if (req.method !== "OPTIONS") {
      const csrfHeader = req.get("x-csrf-token")?.trim();
      const csrfDaSessao = req.usuarioAutenticado?.csrf;

      if (!csrfHeader || !csrfDaSessao || csrfHeader !== csrfDaSessao) {
        res.status(403).json({ erro: "Token CSRF inválido." });
        return;
      }
    }
  }

  next();
}
