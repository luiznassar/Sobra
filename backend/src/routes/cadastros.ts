
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// Listar unidades cadastradas com resumo dos descartes
router.get("/unidades", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const unidades = await prisma.unidade.findMany({
      where: { empresaId },
      select: {
        id: true,
        nome: true,
        empresaId: true,
        descartes: {
          select: {
            quantidadeKg: true,
            custoTotal: true,
          },
        },
      },
      orderBy: { nome: "asc" },
    });

    res.json(unidades.map((unidade) => ({
      id: unidade.id,
      nome: unidade.nome,
      empresaId: unidade.empresaId,
      quantidadeDescartes: unidade.descartes.length,
      pesoTotalKg: unidade.descartes.reduce(
        (total, descarte) => total + Number(descarte.quantidadeKg),
        0
      ),
      prejuizoTotal: unidade.descartes.reduce(
        (total, descarte) => total + Number(descarte.custoTotal),
        0
      ),
    })));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao buscar unidades.",
    });
  }
});

router.post("/unidades", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const { nome } = req.body ?? {};

    if (typeof nome !== "string" || !nome.trim()) {
      res.status(400).json({ erro: "Informe o nome da unidade." });
      return;
    }

    const nomeLimpo = nome.trim();
    const unidades = await prisma.unidade.findMany({
      where: { empresaId },
      select: { nome: true },
    });

    if (unidades.some((unidade) =>
      unidade.nome.trim().toLocaleLowerCase("pt-BR") ===
      nomeLimpo.toLocaleLowerCase("pt-BR")
    )) {
      res.status(409).json({ erro: "Já existe uma unidade com este nome." });
      return;
    }

    const unidade = await prisma.unidade.create({
      data: { nome: nomeLimpo, empresaId },
      select: { id: true, nome: true, empresaId: true },
    });

    res.status(201).json({
      ...unidade,
      quantidadeDescartes: 0,
      pesoTotalKg: 0,
      prejuizoTotal: 0,
    });
  } catch (erro) {
    console.error("Erro ao cadastrar unidade:", erro);
    res.status(500).json({ erro: "Não foi possível cadastrar a unidade." });
  }
});

router.patch("/unidades/:id", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const { id } = req.params;
    const { nome } = req.body ?? {};

    if (typeof nome !== "string" || !nome.trim()) {
      res.status(400).json({ erro: "Informe o novo nome da unidade." });
      return;
    }

    const unidadeAtual = await prisma.unidade.findFirst({
      where: { id, empresaId },
      select: { id: true },
    });

    if (!unidadeAtual) {
      res.status(404).json({ erro: "Unidade não encontrada nesta empresa." });
      return;
    }

    const nomeLimpo = nome.trim();
    const unidades = await prisma.unidade.findMany({
      where: { empresaId, id: { not: id } },
      select: { nome: true },
    });

    if (unidades.some((unidade) =>
      unidade.nome.trim().toLocaleLowerCase("pt-BR") ===
      nomeLimpo.toLocaleLowerCase("pt-BR")
    )) {
      res.status(409).json({ erro: "Já existe uma unidade com este nome." });
      return;
    }

    const unidade = await prisma.unidade.update({
      where: { id },
      data: { nome: nomeLimpo },
      select: { id: true, nome: true, empresaId: true },
    });

    res.json(unidade);
  } catch (erro) {
    console.error("Erro ao editar unidade:", erro);
    res.status(500).json({ erro: "Não foi possível editar a unidade." });
  }
});

router.delete("/unidades/:id", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const { id } = req.params;

    const unidade = await prisma.unidade.findFirst({
      where: { id, empresaId },
      include: { descartes: { select: { id: true } } },
    });

    if (!unidade) {
      res.status(404).json({ erro: "Unidade não encontrada nesta empresa." });
      return;
    }

    if (unidade.descartes.length > 0) {
      res.status(409).json({
        erro: `A unidade não pode ser excluída porque possui ${unidade.descartes.length} descarte(s) registrado(s).`,
      });
      return;
    }

    await prisma.unidade.delete({ where: { id } });
    res.status(204).send();
  } catch (erro) {
    console.error("Erro ao excluir unidade:", erro);
    res.status(500).json({ erro: "Não foi possível excluir a unidade." });
  }
});

// Listar alimentos cadastrados
router.get("/alimentos", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const alimentos = await prisma.alimento.findMany({
      where: { empresaId },
      select: {
        id: true,
        nome: true,
        empresaId: true,
        custoPorKg: true,
      },
      orderBy: { nome: "asc" },
    });

    res.json(alimentos);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao buscar alimentos.",
    });
  }
});


 // Cadastrar um novo alimento
router.post("/alimentos", async (req, res) => {
  try {
    const { nome, custoPorKg } = req.body;
    const empresaId = req.usuarioAutenticado!.empresaId;

    // Verificar os campos obrigatórios
    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      custoPorKg === undefined ||
      custoPorKg === null ||
      custoPorKg === ""
    ) {
      return res.status(400).json({
        erro: "Informe o nome e o custo por kg.",
      });
    }

    const custo = Number(custoPorKg);

    // O custo deve ser um número válido
    if (!Number.isFinite(custo) || custo < 0) {
      return res.status(400).json({
        erro: "Informe um custo por kg válido.",
      });
    }

    // Verificar se a empresa existe
    const empresa = await prisma.empresa.findUnique({
      where: {
        id: empresaId,
      },
    });

    if (!empresa) {
      return res.status(404).json({
        erro: "Empresa não encontrada.",
      });
    }

    // Evitar cadastrar o mesmo alimento duas vezes
    const alimentosExistentes = await prisma.alimento.findMany({
      where: {
        empresaId,
      },
      select: {
        nome: true,
      },
    });

    const jaExiste = alimentosExistentes.some(
      (alimento) =>
        alimento.nome.trim().toLocaleLowerCase("pt-BR") ===
        nome.trim().toLocaleLowerCase("pt-BR")
    );

    if (jaExiste) {
      return res.status(409).json({
        erro: "Este alimento já está cadastrado nesta empresa.",
      });
    }

    // Salvar no PostgreSQL
    const novoAlimento = await prisma.alimento.create({
      data: {
        nome: nome.trim(),
        empresaId,
        custoPorKg: custo,
      },
      select: {
        id: true,
        nome: true,
        empresaId: true,
        custoPorKg: true,
      },
    });

    return res.status(201).json(novoAlimento);
  } catch (erro) {
    console.error("Erro ao cadastrar alimento:", erro);

    return res.status(500).json({
      erro: "Não foi possível cadastrar o alimento.",
    });
  }
});


export default router;
