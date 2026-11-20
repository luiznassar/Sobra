
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const empresaId = req.usuarioAutenticado!.empresaId;
    const [descartes, unidades] = await Promise.all([
      prisma.descarte.findMany({
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
      }),

      prisma.unidade.findMany({
        where: { empresaId },
        orderBy: {
          nome: "asc",
        },
      }),
    ]);

    // ==========================================
    // INDICADORES GERAIS
    // ==========================================

    const prejuizoTotal = descartes.reduce(
      (total, descarte) =>
        total + Number(descarte.custoTotal),
      0
    );

    const quantidadeTotal = descartes.reduce(
      (total, descarte) =>
        total + Number(descarte.quantidadeKg),
      0
    );

    // ==========================================
    // EVOLUÇÃO DIÁRIA - ÚLTIMOS 30 DIAS
    // ==========================================

    const hoje = new Date();

    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 29);
    inicio.setHours(0, 0, 0, 0);

    const evolucaoDiaria = [];

    for (let i = 0; i < 30; i++) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);

      const proximoDia = new Date(dia);
      proximoDia.setDate(proximoDia.getDate() + 1);

      const registrosDoDia = descartes.filter(
        (descarte) => {
          const data = new Date(descarte.criadoEm);
          return data >= dia && data < proximoDia;
        }
      );

      const prejuizo = registrosDoDia.reduce(
        (total, descarte) =>
          total + Number(descarte.custoTotal),
        0
      );

      const ano = dia.getFullYear();
      const mes = String(
        dia.getMonth() + 1
      ).padStart(2, "0");
      const diaDoMes = String(
        dia.getDate()
      ).padStart(2, "0");

      evolucaoDiaria.push({
        data: `${ano}-${mes}-${diaDoMes}`,
        prejuizo: Number(prejuizo.toFixed(2)),
      });
    }

    // ==========================================
    // DESPERDÍCIO POR UNIDADE
    // ==========================================

    const desperdicioPorUnidade = unidades.map(
      (unidade) => {
        const registros = descartes.filter(
          (descarte) =>
            descarte.unidadeId === unidade.id
        );

        const prejuizo = registros.reduce(
          (total, descarte) =>
            total + Number(descarte.custoTotal),
          0
        );

        return {
          id: unidade.id,
          nome: unidade.nome,
          prejuizo,
          quantidadeRegistros: registros.length,
        };
      }
    );

    desperdicioPorUnidade.sort(
      (a, b) => b.prejuizo - a.prejuizo
    );

    // ==========================================
    // ANÁLISE INTELIGENTE DO DESPERDÍCIO
    // ==========================================

    const analiseAlimentos = new Map<
      string,
      {
        nome: string;
        prejuizo: number;
        quantidadeKg: number;
        registros: number;
      }
    >();

    const analiseMotivos = new Map<
      string,
      {
        motivo: string;
        ocorrencias: number;
        prejuizo: number;
      }
    >();

    for (const descarte of descartes) {
      const alimentoId = descarte.alimentoId;
      const nomeAlimento = descarte.alimento.nome;
      const quantidade = Number(descarte.quantidadeKg);
      const custo = Number(descarte.custoTotal);
      const motivo = descarte.motivo;

      // Agrupar descartes por alimento
      const alimentoAtual = analiseAlimentos.get(
        alimentoId
      ) ?? {
        nome: nomeAlimento,
        prejuizo: 0,
        quantidadeKg: 0,
        registros: 0,
      };

      alimentoAtual.prejuizo += custo;
      alimentoAtual.quantidadeKg += quantidade;
      alimentoAtual.registros += 1;

      analiseAlimentos.set(
        alimentoId,
        alimentoAtual
      );

      // Agrupar descartes por motivo
      const motivoAtual = analiseMotivos.get(
        motivo
      ) ?? {
        motivo,
        ocorrencias: 0,
        prejuizo: 0,
      };

      motivoAtual.ocorrencias += 1;
      motivoAtual.prejuizo += custo;

      analiseMotivos.set(motivo, motivoAtual);
    }

    const alimentosOrdenados = Array.from(
      analiseAlimentos.values()
    ).sort(
      (a, b) => b.prejuizo - a.prejuizo
    );

    const motivosOrdenados = Array.from(
        analiseMotivos.values()
    ).sort((a, b) => {
        if (b.prejuizo !== a.prejuizo) {
            return b.prejuizo - a.prejuizo;
        }

        return b.ocorrencias - a.ocorrencias;
    });

    const alimentoCritico =
      alimentosOrdenados[0] ?? null;

    const motivoPrincipal =
      motivosOrdenados[0] ?? null;

    const unidadeCritica =
      desperdicioPorUnidade.find(
        (unidade) => unidade.quantidadeRegistros > 0
      ) ?? null;

    // ==========================================
    // RECOMENDAÇÃO BASEADA NOS DADOS
    // ==========================================

    let recomendacao =
      "Continue registrando os descartes para identificar oportunidades de melhoria.";

    if (motivoPrincipal) {
      const motivo = motivoPrincipal.motivo.toLowerCase();

      if (motivo.includes("vencimento")) {
        recomendacao =
          "Revise as quantidades compradas, os prazos de validade e a rotatividade do estoque. Priorize o uso dos alimentos próximos do vencimento.";
      } else if (
        motivo.includes("armazenamento")
      ) {
        recomendacao =
          "Verifique as condições de armazenamento, a temperatura dos equipamentos e os procedimentos de conservação dos alimentos.";
      } else if (
        motivo.includes("sobra") ||
        motivo.includes("produção")
      ) {
        recomendacao =
          "Analise o volume de produção em relação à demanda e ajuste o planejamento para reduzir sobras.";
      } else if (
        motivo.includes("preparo")
      ) {
        recomendacao =
          "Revise os procedimentos de preparo, o porcionamento e o treinamento da equipe para reduzir perdas.";
      } else {
        recomendacao =
          "Investigue as causas dos descartes mais frequentes e revise os processos relacionados a esses alimentos.";
      }
    }

    const analiseDesperdicio = {
      alimentoCritico: alimentoCritico
        ? {
            ...alimentoCritico,
            prejuizo: Number(
              alimentoCritico.prejuizo.toFixed(2)
            ),
            quantidadeKg: Number(
              alimentoCritico.quantidadeKg.toFixed(3)
            ),
          }
        : null,

      motivoPrincipal,

      unidadeCritica,

      recomendacao,
      rankingAlimentos: alimentosOrdenados.map((alimento) => ({
        ...alimento,
        prejuizo: Number(alimento.prejuizo.toFixed(2)),
        quantidadeKg: Number(alimento.quantidadeKg.toFixed(3)),
      })),
    };

    // ==========================================
    // RESPOSTA DA API
    // ==========================================

    res.json({
      prejuizoTotal,
      quantidadeTotal,
      totalRegistros: descartes.length,
      totalUnidades: unidades.length,

      evolucaoDiaria,
      desperdicioPorUnidade,
      analiseDesperdicio,

      ultimosDescartes: descartes
        .slice(0, 5)
        .map((descarte) => ({
          id: descarte.id,
          alimento: descarte.alimento.nome,
          unidade: descarte.unidade.nome,
          motivo: descarte.motivo,
          quantidadeKg: Number(
            descarte.quantidadeKg
          ),
          custoTotal: Number(
            descarte.custoTotal
          ),
          criadoEm: descarte.criadoEm,
        })),
    });

  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Erro ao carregar o dashboard.",
    });
  }
});

export default router;
