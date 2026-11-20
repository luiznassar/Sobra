
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

// Listar todos os descartes
router.get("/", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const descartes = await prisma.descarte.findMany({
      where: {
        unidade: { is: { empresaId } },
        alimento: { is: { empresaId } },
      },
      include: {
        alimento: true,
        unidade: true,
      },
      orderBy: {
        criadoEm: "desc",
      },
    });

    res.json(descartes);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao buscar descartes.",
    });
  }
});

// Registrar um novo descarte
router.post("/", async (req, res) => {
  try {
    const {
      unidadeId,
      alimentoId,
      quantidadeKg,
      motivo,
      imagemUrl,
    } = req.body;

    if (
      typeof unidadeId !== "string" ||
      typeof alimentoId !== "string" ||
      typeof quantidadeKg !== "number" ||
      !Number.isFinite(quantidadeKg) ||
      quantidadeKg <= 0 ||
      typeof motivo !== "string" ||
      !motivo.trim()
    ) {
      res.status(400).json({
        erro: "Dados inválidos para o descarte.",
      });
      return;
    }

    const empresaId = req.usuarioAutenticado!.empresaId;

    const unidade = await prisma.unidade.findFirst({
      where: { id: unidadeId, empresaId },
    });

    const alimento = await prisma.alimento.findFirst({
      where: { id: alimentoId, empresaId },
    });

    if (!unidade || !alimento) {
      res.status(404).json({
        erro: "Unidade ou alimento não encontrado.",
      });
      return;
    }

    if (unidade.empresaId !== alimento.empresaId) {
      res.status(400).json({
        erro: "Unidade e alimento pertencem a empresas diferentes.",
      });
      return;
    }

    const quantidade = new Prisma.Decimal(quantidadeKg);

    const custoTotal = quantidade
      .mul(alimento.custoPorKg)
      .toDecimalPlaces(2);

    const descarte = await prisma.descarte.create({
      data: {
        unidadeId,
        alimentoId,
        quantidadeKg: quantidade,
        motivo: motivo.trim(),
        imagemUrl: typeof imagemUrl === "string" ? imagemUrl : null,
        custoTotal,
      },
      include: {
        alimento: true,
        unidade: true,
      },
    });

    res.status(201).json(descarte);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao registrar descarte.",
    });
  }
});

export default router;
