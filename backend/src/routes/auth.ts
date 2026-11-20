import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import {
  cookieOptions,
  criarSessao,
  SessionConfigurationError,
  limparSessao,
  SESSION_COOKIE,
  validarSessao,
} from "../auth";

const router = Router();

function origemPermitida(req: Request, res: Response): boolean {
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
    return false;
  }
  return true;
}

function respostaUsuario(res: Response, status: number, usuario: {
  id: string;
  nome: string;
  email: string;
  papel: string;
  empresaId: string;
  empresa: { nome: string };
}, csrfToken: string) {
  res.status(status).json({
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
      empresaNome: usuario.empresa.nome,
    },
    csrfToken,
  });
}

router.post("/cadastro", async (req, res) => {
  if (!origemPermitida(req, res)) return;

  try {
    const { nome, email, senha, nomeEmpresa } = req.body ?? {};

    if (
      typeof nome !== "string" || !nome.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof senha !== "string" || senha.length < 8 ||
      typeof nomeEmpresa !== "string" || !nomeEmpresa.trim()
    ) {
      res.status(400).json({
        erro: "Informe nome, e-mail, senha com mínimo de 8 caracteres e nome da empresa.",
      });
      return;
    }

    const emailNormalizado = email.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);
    if (!emailValido) {
      res.status(400).json({ erro: "Informe um e-mail válido." });
      return;
    }

    const existente = await prisma.usuario.findUnique({
      where: { email: emailNormalizado },
      select: { id: true },
    });
    if (existente) {
      res.status(409).json({ erro: "Já existe uma conta cadastrada com este e-mail." });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const usuario = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: { nome: nomeEmpresa.trim() },
      });

      return tx.usuario.create({
        data: {
          nome: nome.trim(),
          email: emailNormalizado,
          senhaHash,
          papel: "ADMIN",
          empresaId: empresa.id,
        },
        include: { empresa: true },
      });
    });

    const sessao = await criarSessao(usuario.id, usuario.empresaId);
    res.cookie(SESSION_COOKIE, sessao.token, cookieOptions());
    respostaUsuario(res, 201, usuario, sessao.csrfToken);
  } catch (erro) {
    if (erro instanceof SessionConfigurationError) {
      res.status(503).json({ erro: "O serviço de autenticação não está configurado." });
      return;
    }
    console.error("Erro no cadastro:", erro);
    res.status(500).json({ erro: "Não foi possível criar a conta." });
  }
});

router.post("/login", async (req, res) => {
  if (!origemPermitida(req, res)) return;

  try {
    const { email, senha } = req.body ?? {};
    if (typeof email !== "string" || typeof senha !== "string") {
      res.status(400).json({ erro: "Informe e-mail e senha." });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { empresa: true },
    });

    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
      res.status(401).json({ erro: "E-mail ou senha inválidos." });
      return;
    }

    const sessao = await criarSessao(usuario.id, usuario.empresaId);
    res.cookie(SESSION_COOKIE, sessao.token, cookieOptions());
    respostaUsuario(res, 200, usuario, sessao.csrfToken);
  } catch (erro) {
    if (erro instanceof SessionConfigurationError) {
      res.status(503).json({ erro: "O serviço de autenticação não está configurado." });
      return;
    }
    console.error("Erro no login:", erro);
    res.status(500).json({ erro: "Não foi possível entrar." });
  }
});

router.get("/sessao", async (req, res) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string") {
      res.status(401).json({ autenticado: false });
      return;
    }

    const sessao = await validarSessao(token);
    if (!sessao) {
      res.status(401).json({ autenticado: false });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: sessao.sub },
      include: { empresa: true },
    });

    if (!usuario || usuario.empresaId !== sessao.empresaId) {
      res.status(401).json({ autenticado: false });
      return;
    }

    res.json({
      autenticado: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        empresaId: usuario.empresaId,
        empresaNome: usuario.empresa.nome,
      },
      csrfToken: sessao.csrf,
    });
  } catch (erro) {
    console.error("Erro ao consultar sessão:", erro);
    res.status(500).json({ erro: "Não foi possível consultar a sessão." });
  }
});

router.post("/logout", async (req, res) => {
  if (!origemPermitida(req, res)) return;

  const token = req.cookies?.[SESSION_COOKIE];
  const sessao = typeof token === "string" ? await validarSessao(token) : null;
  const csrfHeader = req.get("x-csrf-token")?.trim();

  if (!sessao || !csrfHeader || csrfHeader !== sessao.csrf) {
    res.status(403).json({ erro: "Token CSRF inválido." });
    return;
  }

  limparSessao(res);
  res.status(204).send();
});

export default router;
