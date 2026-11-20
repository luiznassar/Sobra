
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log("Sobra conectado ao PostgreSQL!");

  const tabelas = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `;

  console.log("Tabelas encontradas:", tabelas);
}

main()
  .catch((erro) => {
    console.error("Erro na conexão:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
