import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

function periodoDoMes(ano: number, mes: number) {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mes, 1, 0, 0, 0, 0));
  return { inicio, fim };
}

function validarPeriodo(reqAno: unknown, reqMes: unknown) {
  const ano = Number(reqAno);
  const mes = Number(reqMes);

  if (!Number.isInteger(ano) || ano < 2020 || ano > 2100) return null;
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return null;

  return { ano, mes };
}

router.get("/", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const periodo = validarPeriodo(req.query.ano, req.query.mes);

    if (!periodo) {
      res.status(400).json({ erro: "Informe ano e mês válidos." });
      return;
    }

    const { inicio, fim } = periodoDoMes(periodo.ano, periodo.mes);

    const [unidades, metas, descartes] = await Promise.all([
      prisma.unidade.findMany({
        where: { empresaId },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
      prisma.metaDesperdicio.findMany({
        where: { empresaId, ano: periodo.ano, mes: periodo.mes },
        select: { id: true, unidadeId: true, valorMeta: true },
      }),
      prisma.descarte.findMany({
        where: {
          unidade: { empresaId },
          alimento: { empresaId },
          criadoEm: { gte: inicio, lt: fim },
        },
        select: {
          unidadeId: true,
          custoTotal: true,
        },
      }),
    ]);

    const metaGeral = metas.find((meta) => meta.unidadeId === null);
    const desperdicioGeral = descartes.reduce(
      (total, descarte) => total + Number(descarte.custoTotal),
      0
    );

    const metasPorUnidade = metas
      .filter((meta) => meta.unidadeId !== null)
      .map((meta) => ({
        unidadeId: meta.unidadeId,
        valorMeta: Number(meta.valorMeta),
      }));

    const unidadesResumo = unidades.map((unidade) => {
      const desperdicio = descartes
        .filter((descarte) => descarte.unidadeId === unidade.id)
        .reduce((total, descarte) => total + Number(descarte.custoTotal), 0);
      const meta = metasPorUnidade.find((item) => item.unidadeId === unidade.id);

      return {
        id: unidade.id,
        nome: unidade.nome,
        desperdicio: Number(desperdicio.toFixed(2)),
        valorMeta: meta?.valorMeta ?? null,
      };
    });

    const valorMetaGeral = metaGeral ? Number(metaGeral.valorMeta) : null;

    res.json({
      ano: periodo.ano,
      mes: periodo.mes,
      metaGeral: valorMetaGeral,
      desperdicioGeral: Number(desperdicioGeral.toFixed(2)),
      metasPorUnidade,
      unidades: unidadesResumo,
    });
  } catch (erro) {
    console.error("Erro ao consultar metas:", erro);
    res.status(500).json({ erro: "Não foi possível consultar as metas." });
  }
});

router.put("/", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;

    if (req.usuarioAutenticado!.papel !== "ADMIN") {
      res.status(403).json({ erro: "Somente administradores podem configurar metas." });
      return;
    }

    const periodo = validarPeriodo(req.body?.ano, req.body?.mes);
    const valorNumero = Number(req.body?.valorMeta);
    const unidadeIdInformada = req.body?.unidadeId;

    if (!periodo) {
      res.status(400).json({ erro: "Informe ano e mês válidos." });
      return;
    }

    if (!Number.isFinite(valorNumero) || valorNumero <= 0 || valorNumero > 999999999999) {
      res.status(400).json({ erro: "Informe uma meta financeira válida." });
      return;
    }

    let unidadeId: string | null = null;
    if (unidadeIdInformada !== undefined && unidadeIdInformada !== null) {
      if (typeof unidadeIdInformada !== "string" || !unidadeIdInformada.trim()) {
        res.status(400).json({ erro: "Unidade inválida." });
        return;
      }

      const unidade = await prisma.unidade.findFirst({
        where: { id: unidadeIdInformada.trim(), empresaId },
        select: { id: true },
      });

      if (!unidade) {
        res.status(404).json({ erro: "Unidade não encontrada nesta empresa." });
        return;
      }

      unidadeId = unidade.id;
    }

    const existente = await prisma.metaDesperdicio.findFirst({
      where: {
        empresaId,
        unidadeId,
        ano: periodo.ano,
        mes: periodo.mes,
      },
      select: { id: true },
    });

    let meta;
    if (existente) {
      meta = await prisma.metaDesperdicio.update({
        where: { id: existente.id },
        data: { valorMeta: new Prisma.Decimal(valorNumero.toFixed(2)) },
        select: { id: true, unidadeId: true, ano: true, mes: true, valorMeta: true },
      });
    } else {
      meta = await prisma.metaDesperdicio.create({
        data: {
          empresaId,
          unidadeId,
          ano: periodo.ano,
          mes: periodo.mes,
          valorMeta: new Prisma.Decimal(valorNumero.toFixed(2)),
        },
        select: { id: true, unidadeId: true, ano: true, mes: true, valorMeta: true },
      });
    }

    res.status(existente ? 200 : 201).json({
      id: meta.id,
      unidadeId: meta.unidadeId,
      ano: meta.ano,
      mes: meta.mes,
      valorMeta: Number(meta.valorMeta),
    });
  } catch (erro) {
    console.error("Erro ao salvar meta:", erro);
    res.status(500).json({ erro: "Não foi possível salvar a meta." });
  }
});

export default router;
