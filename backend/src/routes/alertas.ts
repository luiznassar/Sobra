import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

type Alerta = {
  tipo: "meta" | "alimento" | "crescimento";
  titulo: string;
  descricao: string;
  severidade: "atencao" | "critico";
  dados: Record<string, number | string>;
  recomendacao: string;
  relevancia: number;
};

function inicioDaSemanaAtual() {
  const fim = new Date();
  fim.setUTCHours(0, 0, 0, 0);
  fim.setUTCDate(fim.getUTCDate() + 1);

  const inicioAtual = new Date(fim);
  inicioAtual.setUTCDate(inicioAtual.getUTCDate() - 7);

  const inicioAnterior = new Date(inicioAtual);
  inicioAnterior.setUTCDate(inicioAnterior.getUTCDate() - 7);

  return { inicioAtual, inicioAnterior, fim };
}

function arredondar(valor: number) {
  return Number(valor.toFixed(2));
}

router.get("/", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const unidadeIdInformada = typeof req.query.unidadeId === "string"
      ? req.query.unidadeId.trim()
      : "";

    let unidadeId: string | null = null;
    if (unidadeIdInformada) {
      const unidade = await prisma.unidade.findFirst({
        where: { id: unidadeIdInformada, empresaId },
        select: { id: true, nome: true },
      });

      if (!unidade) {
        res.status(404).json({ erro: "Unidade não encontrada nesta empresa." });
        return;
      }
      unidadeId = unidade.id;
    }

    const agora = new Date();
    const ano = agora.getUTCFullYear();
    const mes = agora.getUTCMonth() + 1;
    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const fimMes = new Date(Date.UTC(ano, mes, 1));
    const { inicioAtual, inicioAnterior, fim } = inicioDaSemanaAtual();

    const [unidades, metas, descartesMes, descartesAtual, descartesAnterior] = await Promise.all([
      prisma.unidade.findMany({
        where: { empresaId, ...(unidadeId ? { id: unidadeId } : {}) },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
      prisma.metaDesperdicio.findMany({
        where: {
          empresaId,
          ano,
          mes,
          ...(unidadeId ? { unidadeId } : {}),
        },
        select: { unidadeId: true, valorMeta: true },
      }),
      prisma.descarte.findMany({
        where: {
          unidade: { empresaId, ...(unidadeId ? { id: unidadeId } : {}) },
          alimento: { empresaId },
          criadoEm: { gte: inicioMes, lt: fimMes },
        },
        include: { alimento: true, unidade: true },
      }),
      prisma.descarte.findMany({
        where: {
          unidade: { empresaId, ...(unidadeId ? { id: unidadeId } : {}) },
          alimento: { empresaId },
          criadoEm: { gte: inicioAtual, lt: fim },
        },
        select: { custoTotal: true },
      }),
      prisma.descarte.findMany({
        where: {
          unidade: { empresaId, ...(unidadeId ? { id: unidadeId } : {}) },
          alimento: { empresaId },
          criadoEm: { gte: inicioAnterior, lt: inicioAtual },
        },
        select: { custoTotal: true },
      }),
    ]);

    const alertas: Alerta[] = [];

    const metaGeral = metas.find((meta) => meta.unidadeId === null);
    const desperdicioGeralMes = descartesMes.reduce(
      (total, descarte) => total + Number(descarte.custoTotal),
      0
    );

    if (!unidadeId && metaGeral) {
      const meta = Number(metaGeral.valorMeta);
      const porcentagem = meta > 0 ? (desperdicioGeralMes / meta) * 100 : 0;

      if (porcentagem >= 100) {
        const excedente = desperdicioGeralMes - meta;
        alertas.push({
          tipo: "meta",
          titulo: "Meta mensal atingida ou ultrapassada",
          descricao: "O desperdício financeiro geral do mês alcançou ou superou a meta configurada.",
          severidade: "critico",
          dados: {
            mes: `${mes}/${ano}`,
            desperdicio: arredondar(desperdicioGeralMes),
            meta: arredondar(meta),
            utilizacaoPercentual: arredondar(porcentagem),
            excedente: arredondar(excedente),
          },
          recomendacao: "Suspenda ações corretivas pontuais e faça uma revisão imediata dos motivos, unidades e fornecedores associados aos maiores descartes.",
          relevancia: 100,
        });
      } else if (porcentagem >= 70) {
        const restante = meta - desperdicioGeralMes;
        alertas.push({
          tipo: "meta",
          titulo: "Meta mensal em risco",
          descricao: "O desperdício financeiro geral já utilizou pelo menos 70% da meta mensal.",
          severidade: "atencao",
          dados: {
            mes: `${mes}/${ano}`,
            desperdicio: arredondar(desperdicioGeralMes),
            meta: arredondar(meta),
            utilizacaoPercentual: arredondar(porcentagem),
            restante: arredondar(restante),
          },
          recomendacao: "Priorize ações de curto prazo para reduzir sobremesas, vencimentos e sobras antes do fim do mês.",
          relevancia: 80,
        });
      }
    }

    for (const unidade of unidades) {
      const metaUnidade = metas.find((meta) => meta.unidadeId === unidade.id);
      if (!metaUnidade) continue;

      const meta = Number(metaUnidade.valorMeta);
      const desperdicio = descartesMes
        .filter((descarte) => descarte.unidadeId === unidade.id)
        .reduce((total, descarte) => total + Number(descarte.custoTotal), 0);
      const porcentagem = meta > 0 ? (desperdicio / meta) * 100 : 0;

      if (porcentagem >= 100) {
        alertas.push({
          tipo: "meta",
          titulo: `Meta de ${unidade.nome} atingida ou ultrapassada`,
          descricao: `A unidade alcançou ou superou 100% da meta mensal de desperdício.`,
          severidade: "critico",
          dados: {
            unidade: unidade.nome,
            mes: `${mes}/${ano}`,
            desperdicio: arredondar(desperdicio),
            meta: arredondar(meta),
            utilizacaoPercentual: arredondar(porcentagem),
            excedente: arredondar(desperdicio - meta),
          },
          recomendacao: "Analise imediatamente os registros da unidade e ajuste produção, armazenamento e porcionamento.",
          relevancia: 95,
        });
      } else if (porcentagem >= 70) {
        alertas.push({
          tipo: "meta",
          titulo: `Meta de ${unidade.nome} em risco`,
          descricao: `A unidade já utilizou pelo menos 70% da meta mensal de desperdício.`,
          severidade: "atencao",
          dados: {
            unidade: unidade.nome,
            mes: `${mes}/${ano}`,
            desperdicio: arredondar(desperdicio),
            meta: arredondar(meta),
            utilizacaoPercentual: arredondar(porcentagem),
            restante: arredondar(meta - desperdicio),
          },
          recomendacao: "Revise os descartes recentes da unidade e defina ações corretivas antes que a meta seja ultrapassada.",
          relevancia: 75,
        });
      }
    }

    if (desperdicioGeralMes > 0) {
      const porAlimento = new Map<string, { nome: string; prejuizo: number }>();

      for (const descarte of descartesMes) {
        const atual = porAlimento.get(descarte.alimentoId) ?? {
          nome: descarte.alimento.nome,
          prejuizo: 0,
        };
        atual.prejuizo += Number(descarte.custoTotal);
        porAlimento.set(descarte.alimentoId, atual);
      }

      for (const [alimentoId, alimento] of porAlimento) {
        const participacao = (alimento.prejuizo / desperdicioGeralMes) * 100;
        if (participacao < 40) continue;

        alertas.push({
          tipo: "alimento",
          titulo: "Alimento crítico identificado",
          descricao: `${alimento.nome} representa ${arredondar(participacao)}% do prejuízo financeiro no período analisado.`,
          severidade: participacao >= 50 ? "critico" : "atencao",
          dados: {
            alimentoId,
            alimento: alimento.nome,
            prejuizo: arredondar(alimento.prejuizo),
            participacaoPercentual: arredondar(participacao),
            prejuizoTotal: arredondar(desperdicioGeralMes),
          },
          recomendacao: "Revise validade, demanda, estoque e preparação deste alimento; ajuste compras e controle por unidade.",
          relevancia: participacao >= 50 ? 90 : 70,
        });
      }
    }

    const prejuizoAtual = descartesAtual.reduce(
      (total, descarte) => total + Number(descarte.custoTotal),
      0
    );
    const prejuizoAnterior = descartesAnterior.reduce(
      (total, descarte) => total + Number(descarte.custoTotal),
      0
    );

    if (prejuizoAnterior > 0) {
      const crescimento = ((prejuizoAtual - prejuizoAnterior) / prejuizoAnterior) * 100;
      if (crescimento >= 30) {
        alertas.push({
          tipo: "crescimento",
          titulo: "Aumento de desperdício nos últimos 7 dias",
          descricao: "O prejuízo financeiro dos últimos 7 dias cresceu pelo menos 30% em relação aos 7 dias anteriores.",
          severidade: crescimento >= 50 ? "critico" : "atencao",
          dados: {
            prejuizoAtual: arredondar(prejuizoAtual),
            prejuizoAnterior: arredondar(prejuizoAnterior),
            crescimentoPercentual: arredondar(crescimento),
          },
          recomendacao: "Compare motivos, unidades e alimentos dos dois períodos e corrija a causa recente com maior impacto.",
          relevancia: crescimento >= 50 ? 85 : 65,
        });
      }
    }

    alertas.sort((a, b) => {
      if (a.severidade !== b.severidade) {
        return a.severidade === "critico" ? -1 : 1;
      }
      return b.relevancia - a.relevancia;
    });

    res.json({
      ano,
      mes,
      unidadeId,
      unidades,
      alertas,
    });
  } catch (erro) {
    console.error("Erro ao gerar alertas:", erro);
    res.status(500).json({ erro: "Não foi possível gerar os alertas." });
  }
});

export default router;
