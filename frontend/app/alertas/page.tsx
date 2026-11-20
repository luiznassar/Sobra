"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle, CircleAlert, Loader2, ShieldAlert } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import { apiFetch } from "../../lib/api";

type Unidade = { id: string; nome: string };
type Alerta = {
  tipo: "meta" | "alimento" | "crescimento";
  titulo: string;
  descricao: string;
  severidade: "atencao" | "critico";
  dados: Record<string, number | string>;
  recomendacao: string;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatoDado(chave: string, valor: number | string) {
  if (typeof valor === "string") return valor;
  if (chave.includes("Percentual") || chave === "crescimentoPercentual" || chave === "utilizacaoPercentual" || chave === "participacaoPercentual") {
    return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  if (chave.includes("prejuizo") || chave.includes("desperdicio") || chave === "meta" || chave === "restante" || chave === "excedente" || chave === "prejuizoTotal") {
    return moeda(valor);
  }
  return String(valor);
}

function nomeDado(chave: string) {
  const nomes: Record<string, string> = {
    mes: "Mês",
    unidade: "Unidade",
    alimento: "Alimento",
    desperdicio: "Desperdício",
    meta: "Meta",
    restante: "Restante",
    excedente: "Excedente",
    utilizacaoPercentual: "Meta utilizada",
    participacaoPercentual: "Participação no prejuízo",
    prejuizo: "Prejuízo",
    prejuizoTotal: "Prejuízo total",
    prejuizoAtual: "Últimos 7 dias",
    prejuizoAnterior: "7 dias anteriores",
    crescimentoPercentual: "Crescimento",
  };
  return nomes[chave] ?? chave;
}

function AlertasPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState("");
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [anoMes, setAnoMes] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar(unidade = unidadeId) {
    setCarregando(true);
    setErro("");

    try {
      const caminho = unidade
        ? `/api/alertas?unidadeId=${encodeURIComponent(unidade)}`
        : "/api/alertas";
      const resposta = await apiFetch(caminho);
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar os alertas.");

      setUnidades(dados.unidades ?? []);
      setAlertas(dados.alertas ?? []);
      setAnoMes(`${String(dados.mes).padStart(2, "0")}/${dados.ano}`);
    } catch (erro) {
      setAlertas([]);
      setErro(erro instanceof Error ? erro.message : "Não foi possível carregar os alertas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar("");
  }, []);

  function alterarUnidade(valor: string) {
    setUnidadeId(valor);
    carregar(valor);
  }

  return (
    <main className="register-page alerts-page">
      <header className="register-header">
        <Link href="/" className="brand">
          <span className="brand-mark">s.</span>
          <span>SOBRA<span className="brand-dot">.</span><small>INTELIGÊNCIA OPERACIONAL</small></span>
        </Link>
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar ao painel</Link>
      </header>

      <section className="register-container alerts-container">
        <p className="eyebrow">INTELIGÊNCIA / ALERTAS</p>
        <h1>Alertas inteligentes</h1>
        <p className="subheading">Monitoramento automático baseado nos descartes reais registrados no Sobra.</p>

        <div className="alerts-filter">
          <label htmlFor="filtro-unidade">Unidade</label>
          <select id="filtro-unidade" value={unidadeId} onChange={(event) => alterarUnidade(event.target.value)}>
            <option value="">Todas as unidades</option>
            {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
          </select>
          {anoMes && <span>Período principal: {anoMes}</span>}
        </div>

        {erro && <p className="alerts-message alerts-error" role="alert">{erro}</p>}

        {carregando ? (
          <div className="alerts-state"><Loader2 className="spin" size={20} /> Analisando dados reais...</div>
        ) : alertas.length === 0 ? (
          <div className="alerts-state alerts-empty">
            <ShieldAlert size={30} />
            <strong>Nenhum alerta neste momento</strong>
            <span>Não foram encontrados riscos ou aumentos relevantes nos dados analisados.</span>
          </div>
        ) : (
          <div className="alerts-list">
            {alertas.map((alerta, indice) => (
              <article className={`alert-card ${alerta.severidade}`} key={`${alerta.tipo}-${indice}`}>
                <div className="alert-card-icon">
                  {alerta.severidade === "critico" ? <CircleAlert size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div className="alert-card-body">
                  <div className="alert-card-heading">
                    <span className={`alert-severity ${alerta.severidade}`}>{alerta.severidade === "critico" ? "Crítico" : "Atenção"}</span>
                    <h2>{alerta.titulo}</h2>
                  </div>
                  <p>{alerta.descricao}</p>

                  <dl className="alert-data">
                    {Object.entries(alerta.dados)
                      .filter(([chave]) => chave !== "alimentoId")
                      .map(([chave, valor]) => (
                        <div key={chave}>
                          <dt>{nomeDado(chave)}</dt>
                          <dd>{formatoDado(chave, valor)}</dd>
                        </div>
                      ))}
                  </dl>

                  <div className="alert-recommendation">
                    <strong>Recomendação</strong>
                    <span>{alerta.recomendacao}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function AlertasPageGuard() {
  return <AuthGuard><AlertasPage /></AuthGuard>;
}
