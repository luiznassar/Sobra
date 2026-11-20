"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save, Target } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import { apiFetch } from "../../lib/api";

type Unidade = {
  id: string;
  nome: string;
  desperdicio: number;
  valorMeta: number | null;
};

type MetasData = {
  ano: number;
  mes: number;
  metaGeral: number | null;
  desperdicioGeral: number;
  metasPorUnidade: { unidadeId: string; valorMeta: number }[];
  unidades: Unidade[];
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesNome(mes: number) {
  return new Date(2020, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
}

function progresso(valorMeta: number | null, desperdicio: number) {
  if (!valorMeta || valorMeta <= 0) return { porcentagem: 0, estado: "sem-meta", excedente: 0, restante: 0 };
  const porcentagem = (desperdicio / valorMeta) * 100;
  const excedente = Math.max(desperdicio - valorMeta, 0);
  const restante = Math.max(valorMeta - desperdicio, 0);
  const estado = porcentagem >= 100 ? "vermelho" : porcentagem >= 70 ? "amarelo" : "verde";
  return { porcentagem, estado, excedente, restante };
}

function BarraMeta({ valorMeta, desperdicio }: { valorMeta: number | null; desperdicio: number }) {
  const resultado = progresso(valorMeta, desperdicio);

  return (
    <div className="goal-progress-wrap">
      <div className="goal-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(resultado.porcentagem, 100)}>
        <div
          className={`goal-progress-fill ${resultado.estado}`}
          style={{ width: `${Math.min(resultado.porcentagem, 100)}%` }}
        />
      </div>
      {valorMeta ? (
        <div className="goal-progress-caption">
          <strong>{resultado.porcentagem.toFixed(1)}% utilizado</strong>
          {resultado.excedente > 0
            ? <span className="goal-exceeded">Meta ultrapassada em {moeda(resultado.excedente)}</span>
            : <span>{moeda(resultado.restante)} restante</span>}
        </div>
      ) : <p className="goal-empty-note">Configure uma meta para acompanhar o progresso.</p>}
    </div>
  );
}

function MetasPage() {
  const atual = new Date();
  const [ano, setAno] = useState(String(atual.getFullYear()));
  const [mes, setMes] = useState(String(atual.getMonth() + 1));
  const [dados, setDados] = useState<MetasData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [metaGeralInput, setMetaGeralInput] = useState("");
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("");
  const [metaUnidadeInput, setMetaUnidadeInput] = useState("");

  async function carregar() {
    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await apiFetch(`/api/metas?ano=${ano}&mes=${mes}`);
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível carregar as metas.");

      setDados(resultado);
      setMetaGeralInput(resultado.metaGeral == null ? "" : String(resultado.metaGeral));
      setUnidadeSelecionada(resultado.unidades[0]?.id ?? "");

      const primeiraMeta = resultado.unidades[0]?.valorMeta;
      setMetaUnidadeInput(primeiraMeta == null ? "" : String(primeiraMeta));
    } catch (erro) {
      setDados(null);
      setErro(erro instanceof Error ? erro.message : "Não foi possível carregar as metas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [ano, mes]);

  useEffect(() => {
    if (!dados || !unidadeSelecionada) return;
    const unidade = dados.unidades.find((item) => item.id === unidadeSelecionada);
    setMetaUnidadeInput(unidade?.valorMeta == null ? "" : String(unidade.valorMeta));
  }, [unidadeSelecionada, dados]);

  async function salvarMeta(event: React.FormEvent<HTMLFormElement>, unidadeId: string | null) {
    event.preventDefault();
    const input = unidadeId ? metaUnidadeInput : metaGeralInput;
    const valorMeta = Number(input);

    setErro("");
    setMensagem("");

    if (!Number.isFinite(valorMeta) || valorMeta <= 0) {
      setErro("Informe uma meta financeira válida e maior que zero.");
      return;
    }

    setSalvando(true);
    try {
      const resposta = await apiFetch("/api/metas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano: Number(ano), mes: Number(mes), valorMeta, unidadeId }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar a meta.");
      setMensagem(unidadeId ? "Meta da unidade atualizada." : "Meta geral atualizada.");
      await carregar();
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não foi possível salvar a meta.");
    } finally {
      setSalvando(false);
    }
  }

  const anos = useMemo(() => {
    const atualAno = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, indice) => String(atualAno - indice));
  }, []);

  return (
    <main className="register-page goals-page">
      <header className="register-header">
        <Link href="/" className="brand">
          <span className="brand-mark">s.</span>
          <span>SOBRA<span className="brand-dot">.</span><small>INTELIGÊNCIA OPERACIONAL</small></span>
        </Link>
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar ao painel</Link>
      </header>

      <section className="register-container goals-container">
        <p className="eyebrow">GESTÃO / METAS DE DESPERDÍCIO</p>
        <h1>Metas mensais</h1>
        <p className="subheading">Defina limites financeiros e acompanhe o desperdício real registrado.</p>

        <div className="goals-period">
          <label htmlFor="ano">Ano</label>
          <select id="ano" value={ano} onChange={(event) => setAno(event.target.value)}>
            {anos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label htmlFor="mes">Mês</label>
          <select id="mes" value={mes} onChange={(event) => setMes(event.target.value)}>
            {Array.from({ length: 12 }, (_, indice) => indice + 1).map((item) => (
              <option key={item} value={item}>{mesNome(item)}</option>
            ))}
          </select>
        </div>

        {erro && <p className="goals-message goals-error" role="alert">{erro}</p>}
{mensagem && <p className="goals-message goals-success" role="status">{mensagem}</p>}

        {carregando ? (
          <div className="goals-state"><Loader2 className="spin" size={20} /> Carregando metas...</div>
        ) : dados ? (
          <>
            <section className="goal-general">
              <div className="goal-card-heading">
                <div className="goal-icon"><Target size={19} /></div>
                <div>
                  <p className="eyebrow">META GERAL</p>
                  <h2>{mesNome(dados.mes)} de {dados.ano}</h2>
                </div>
              </div>

              <div className="goal-summary-grid">
                <div><span>Meta mensal</span><strong>{dados.metaGeral == null ? "Não definida" : moeda(dados.metaGeral)}</strong></div>
                <div><span>Desperdício acumulado</span><strong>{moeda(dados.desperdicioGeral)}</strong></div>
              </div>

              <BarraMeta valorMeta={dados.metaGeral} desperdicio={dados.desperdicioGeral} />

              <form className="goal-form" onSubmit={(event) => salvarMeta(event, null)}>
                <label htmlFor="meta-geral">Valor da meta geral (R$)</label>
                <input id="meta-geral" type="number" min="0.01" step="0.01" inputMode="decimal" value={metaGeralInput} onChange={(event) => setMetaGeralInput(event.target.value)} placeholder="Ex.: 2500,00" />
                <button type="submit" disabled={salvando}><Save size={16} /> {salvando ? "Salvando..." : "Salvar meta geral"}</button>
              </form>
            </section>

            <section className="goal-units">
              <div className="goal-card-heading">
                <div><p className="eyebrow">METAS POR UNIDADE</p><h2>Desempenho individual</h2></div>
              </div>

              {dados.unidades.length === 0 ? (
                <p className="goals-empty">Nenhuma unidade cadastrada para configurar metas específicas.</p>
              ) : (
                <>
                  <form className="goal-form goal-unit-form" onSubmit={(event) => salvarMeta(event, unidadeSelecionada)}>
                    <label htmlFor="unidade-meta">Unidade</label>
                    <select id="unidade-meta" value={unidadeSelecionada} onChange={(event) => setUnidadeSelecionada(event.target.value)}>
                      {dados.unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
                    </select>
                    <label htmlFor="meta-unidade">Meta da unidade (R$)</label>
                    <input id="meta-unidade" type="number" min="0.01" step="0.01" inputMode="decimal" value={metaUnidadeInput} onChange={(event) => setMetaUnidadeInput(event.target.value)} placeholder="Ex.: 800,00" />
                    <button type="submit" disabled={salvando}><Save size={16} /> {salvando ? "Salvando..." : "Salvar meta da unidade"}</button>
                  </form>

                  <div className="goal-unit-list">
                    {dados.unidades.map((unidade) => (
                      <article className="goal-unit-row" key={unidade.id}>
                        <div className="goal-unit-title"><strong>{unidade.nome}</strong><span>{moeda(unidade.desperdicio)} acumulados</span></div>
                        <BarraMeta valorMeta={unidade.valorMeta} desperdicio={unidade.desperdicio} />
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function MetasPageGuard() {
  return <AuthGuard><MetasPage /></AuthGuard>;
}
