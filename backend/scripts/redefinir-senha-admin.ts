import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

function lerArgumento(nome: string): string | undefined {
  const indice = process.argv.indexOf(`--${nome}`);
  if (indice === -1) return undefined;
  return process.argv[indice + 1]?.trim();
}

async function main() {
  const email = lerArgumento("email")?.toLowerCase();
  const senha = process.env.ADMIN_NEW_PASSWORD;

  if (!email || !senha) {
    throw new Error(
      "Uso: npm run redefinir-senha-admin -- --email <email>. A senha deve estar em ADMIN_NEW_PASSWORD."
    );
  }

  if (senha.length < 8) {
    throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      papel: true,
      empresa: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  if (!usuario) {
    throw new Error("Usuário administrador não encontrado.");
  }

  if (usuario.papel !== "ADMIN") {
    throw new Error("O usuário informado não possui papel de administrador.");
  }

  if (usuario.empresa.nome !== "Rede Sabor") {
    throw new Error("O usuário não pertence à empresa Rede Sabor.");
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash },
  });

  console.log("Senha redefinida com sucesso para o administrador da empresa Rede Sabor.");
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : "Falha ao redefinir a senha.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
