-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "custoPorKg" DECIMAL(10,2) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "Alimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Descarte" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "alimentoId" TEXT NOT NULL,
    "quantidadeKg" DECIMAL(10,3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "custoTotal" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Descarte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Unidade_empresaId_idx" ON "Unidade"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Alimento_empresaId_nome_key" ON "Alimento"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "Descarte_unidadeId_criadoEm_idx" ON "Descarte"("unidadeId", "criadoEm");

-- CreateIndex
CREATE INDEX "Descarte_alimentoId_idx" ON "Descarte"("alimentoId");

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alimento" ADD CONSTRAINT "Alimento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Descarte" ADD CONSTRAINT "Descarte_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Descarte" ADD CONSTRAINT "Descarte_alimentoId_fkey" FOREIGN KEY ("alimentoId") REFERENCES "Alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
