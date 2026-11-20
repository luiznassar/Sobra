import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

function lerArgumento(nome: string): string | undefined {
  const indice = process.argv.indexOf(`--${nome}`);
  if (indice === -1) return undefined;
  return process.argv[indice + 1]?.trim();
}

async function main() {
  const empresaId = lerArgumento("empresa-id");
  const nome = lerArgumento("nome");
  const email = lerArgumento("email")?.toLowerCase();
  const senha = process.env.ADMIN_DEMO_PASSWORD;

  if (!empresaId || !nome || !email || !senha) {
    throw new Error(
      "Uso: npm run vincular-admin-demo -- --empresa-id <id> --nome <nome> --email <email>. A senha deve estar em ADMIN_DEMO_PASSWORD."
    );
  }

  if (senha.length < 8) {
    throw new Error("ADMIN_DEMO_PASSWORD deve ter pelo menos 8 caracteres.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: { usuarios: { select: { id: true } } },
  });

  if (!empresa) {
    throw new Error("Empresa não encontrada pelo ID informado.");
  }

  if (empresa.usuarios.length > 0) {
    throw new Error("Esta empresa já possui conta vinculada; o vínculo não foi alterado.");
  }

  const emailExistente = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });

  if (emailExistente) {
    throw new Error("Este e-mail já pertence a outra conta.");
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
      papel: "ADMIN",
      empresaId: empresa.id,
    },
  });

  console.log(`Primeiro administrador vinculado à empresa ${empresa.id}.`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : "Falha ao vincular administrador.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
