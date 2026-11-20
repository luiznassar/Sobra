"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Wallet, Scale, ClipboardList } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import { apiFetch } from "../../lib/api";

type Resumo = { nome: string; prejuizo: number; quantidadeKg: number; registros: number };
type Registro = { id: string; data: string; alimento: string; unidade: string; motivo: string; quantidadeKg: number; custoTotal: number };
type Relatorio = {
  periodo: string;
  prejuizoTotal: number;
  quantidadeTotal: number;
  totalRegistros: number;
  porAlimento: Resumo[];
  porUnidade: Resumo[];
  porMotivo: Resumo[];
  registros: Registro[];
};

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const peso = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`;

function Tabela({ titulo, itens }: { titulo: string; itens: Resumo[] }) {
  return (
    <article className="panel">
      <div className="panel-heading"><div><h2>{titulo}</h2><p>Ordenado por prejuízo financeiro</p></div></div>
      {itens.length ? (
        <div className="table-wrap"><table className="reports-table">
          <thead><tr><th>Descrição</th><th>Quantidade</th><th>Prejuízo</th></tr></thead>
          <tbody>{itens.map((item) => <tr key={item.nome}>
            <td><strong>{item.nome}</strong><div style={{ color: "#8a988c", fontSize: 10 }}>{item.registros} registro(s)</div></td>
            <td>{peso(item.quantidadeKg)}</td><td><strong>{moeda(item.prejuizo)}</strong></td>
          </tr>)}</tbody>
        </table></div>
      ) : <p className="reports-empty">Nenhum descarte registrado neste período.</p>}
    </article>
  );
}

function exportarCsv(dados: Relatorio) {
  const linhas = [
    ["Data", "Alimento", "Unidade", "Motivo", "Quantidade (kg)", "Prejuízo (R$)"],
    ...dados.registros.map((r) => [
      new Date(r.data).toLocaleDateString("pt-BR"), r.alimento, r.unidade,
      r.motivo, String(r.quantidadeKg).replace(".", ","), String(r.custoTotal).replace(".", ","),
    ]),
  ];
  const csv = "\uFEFF" + linhas.map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `sobra-relatorio-${dados.periodo}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Relatorios() {
  const [periodo, setPeriodo] = useState("30");
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const resposta = await apiFetch(`/api/relatorios?periodo=${periodo}`);
        if (!resposta.ok) throw new Error("Não foi possível carregar o relatório.");
        const resultado: Relatorio = await resposta.json();
        if (ativo) setDados(resultado);
      } catch {
        if (ativo) { setDados(null); setErro("Não foi possível carregar os relatórios. Confira se o backend está ligado."); }
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [periodo]);

  return (
    <main className="register-page reports-page">
      <div className="register-header">
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar ao dashboard</Link>
        <Link href="/" className="brand"><span className="brand-mark">s.</span><span>SOBRA<span className="brand-dot">.</span><small>INTELIGÊNCIA OPERACIONAL</small></span></Link>
      </div>
      <div className="register-container" style={{ maxWidth: 1100 }}>
        <div className="page-heading" style={{ paddingTop: 10 }}>
          <div><p className="eyebrow">ANÁLISE FINANCEIRA</p><h1>Relatórios de desperdício</h1><p className="subheading">Explore os custos dos descartes e descubra onde reduzir perdas.</p></div>
        </div>
        <div className="reports-filters">
          <label htmlFor="periodo">Período analisado</label>
          <select id="periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="todos">Todo o histórico</option>
          </select>
          <button className="reports-export" style={{ marginLeft: "auto" }} disabled={!dados || carregando} onClick={() => dados && exportarCsv(dados)}><Download size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />Exportar CSV</button>
        </div>
        {erro && <p className="form-message" role="alert">{erro}</p>}
        {carregando && <p className="subheading">Carregando relatório...</p>}
        {!carregando && dados && <>
          <section className="reports-summary">
            <article className="metric-card"><div className="metric-top"><span>Prejuízo no período</span><Wallet size={18} /></div><div className="metric-value">{moeda(dados.prejuizoTotal)}</div></article>
            <article className="metric-card"><div className="metric-top"><span>Alimentos descartados</span><Scale size={18} /></div><div className="metric-value">{peso(dados.quantidadeTotal)}</div></article>
            <article className="metric-card"><div className="metric-top"><span>Descartes registrados</span><ClipboardList size={18} /></div><div className="metric-value">{dados.totalRegistros}</div></article>
          </section>
          <div className="reports-tables">
            <Tabela titulo="Prejuízo por alimento" itens={dados.porAlimento} />
            <Tabela titulo="Prejuízo por unidade" itens={dados.porUnidade} />
            <Tabela titulo="Prejuízo por motivo" itens={dados.porMotivo} />
            <article className="panel"><div className="panel-heading"><div><h2>Resumo do período</h2><p>Indicadores dos descartes cadastrados</p></div></div>
              <p className="subheading" style={{ marginTop: 20 }}>Os valores refletem somente os registros salvos no Sobra dentro do período selecionado. O CSV inclui os descartes individuais para análise no Excel.</p>
              <Link href="/registros" className="text-link" style={{ marginTop: 24, display: "inline-flex" }}>Registrar novo descarte</Link>
            </article>
          </div>
        </>}
      </div>
    </main>
  );
}

export default function RelatoriosPage() {
  return (
    <AuthGuard>
      <Relatorios />
    </AuthGuard>
  );
}
