-- CreateTable
CREATE TABLE "MetaDesperdicio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "unidadeId" TEXT,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "valorMeta" DECIMAL(12,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaDesperdicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaDesperdicio_empresaId_unidadeId_ano_mes_key"
ON "MetaDesperdicio"("empresaId", "unidadeId", "ano", "mes");

-- Índice geral único por empresa, ano e mês
CREATE UNIQUE INDEX "MetaDesperdicio_metaGeral_key"
ON "MetaDesperdicio"("empresaId", "ano", "mes")
WHERE "unidadeId" IS NULL;

-- CreateIndex
CREATE INDEX "MetaDesperdicio_empresaId_ano_mes_idx"
ON "MetaDesperdicio"("empresaId", "ano", "mes");

-- CreateIndex
CREATE INDEX "MetaDesperdicio_unidadeId_ano_mes_idx"
ON "MetaDesperdicio"("unidadeId", "ano", "mes");

-- AddForeignKey
ALTER TABLE "MetaDesperdicio"
ADD CONSTRAINT "MetaDesperdicio_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaDesperdicio"
ADD CONSTRAINT "MetaDesperdicio_unidadeId_fkey"
FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
