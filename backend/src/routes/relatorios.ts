import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const periodo = String(req.query.periodo ?? "30");
    if (!["7", "30", "90", "todos"].includes(periodo)) {
      res.status(400).json({ erro: "Período inválido." });
      return;
    }

    let inicio: Date | undefined;
    if (periodo !== "todos") {
      inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      inicio.setDate(inicio.getDate() - Number(periodo) + 1);
    }

    const descartes = await prisma.descarte.findMany({
      where: {
        unidade: { is: { empresaId } },
        alimento: { is: { empresaId } },
        ...(inicio ? { criadoEm: { gte: inicio } } : {}),
      },
      include: { alimento: true, unidade: true },
      orderBy: { criadoEm: "desc" },
    });

    type Resumo = { nome: string; prejuizo: number; quantidadeKg: number; registros: number };
    const porAlimento = new Map<string, Resumo>();
    const porUnidade = new Map<string, Resumo>();
    const porMotivo = new Map<string, Resumo>();

    function acumular(mapa: Map<string, Resumo>, chave: string, nome: string, custo: number, quantidade: number) {
      const atual = mapa.get(chave) ?? { nome, prejuizo: 0, quantidadeKg: 0, registros: 0 };
      atual.prejuizo += custo;
      atual.quantidadeKg += quantidade;
      atual.registros += 1;
      mapa.set(chave, atual);
    }

    let prejuizoTotal = 0;
    let quantidadeTotal = 0;
    for (const descarte of descartes) {
      const custo = Number(descarte.custoTotal);
      const quantidade = Number(descarte.quantidadeKg);
      prejuizoTotal += custo;
      quantidadeTotal += quantidade;
      acumular(porAlimento, descarte.alimentoId, descarte.alimento.nome, custo, quantidade);
      acumular(porUnidade, descarte.unidadeId, descarte.unidade.nome, custo, quantidade);
      acumular(porMotivo, descarte.motivo, descarte.motivo, custo, quantidade);
    }

    function ordenar(mapa: Map<string, Resumo>) {
      return Array.from(mapa.values())
        .map((item) => ({ ...item, prejuizo: Number(item.prejuizo.toFixed(2)), quantidadeKg: Number(item.quantidadeKg.toFixed(3)) }))
        .sort((a, b) => b.prejuizo - a.prejuizo);
    }

    res.json({
      periodo,
      prejuizoTotal: Number(prejuizoTotal.toFixed(2)),
      quantidadeTotal: Number(quantidadeTotal.toFixed(3)),
      totalRegistros: descartes.length,
      porAlimento: ordenar(porAlimento),
      porUnidade: ordenar(porUnidade),
      porMotivo: ordenar(porMotivo),
      registros: descartes.map((d) => ({
        id: d.id,
        data: d.criadoEm,
        alimento: d.alimento.nome,
        unidade: d.unidade.nome,
        motivo: d.motivo,
        quantidadeKg: Number(d.quantidadeKg),
        custoTotal: Number(d.custoTotal),
      })),
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao gerar relatório." });
  }
});

export default router;
