"use client";



import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "../components/AuthGuard";
import { apiFetch, logout } from "../lib/api";

import {

  ArrowDownRight, ArrowUpRight, Bell, Camera, ChevronDown,

  CircleHelp, ClipboardList, LayoutDashboard, Lightbulb, MapPin,

  LogOut, MoreHorizontal, Package, Search, Settings, Target, Utensils, Wallet,

} from "lucide-react";

import GraficoDesperdicio from "../components/GraficoDesperdicio";






type UnidadeResumo = {

  id: string;

  nome: string;

  prejuizo: number;

  quantidadeRegistros: number;

};



type AnaliseDesperdicio = {

  alimentoCritico: {

    nome: string;

    prejuizo: number;

    quantidadeKg: number;

    registros: number;

  } | null;

  motivoPrincipal: {

    motivo: string;

    ocorrencias: number;

    prejuizo: number;

  } | null;

  unidadeCritica: UnidadeResumo | null;

  recomendacao: string;
  rankingAlimentos?: { nome: string; prejuizo: number; quantidadeKg: number; registros: number }[];

};



type DashboardData = {

  prejuizoTotal: number;

  quantidadeTotal: number;

  totalRegistros: number;

  totalUnidades: number;

  desperdicioPorUnidade: UnidadeResumo[];

  ultimosDescartes: {

    id: string;

    alimento: string;

    unidade: string;

    motivo: string;

    quantidadeKg: number;

    custoTotal: number;

    criadoEm: string;

  }[];

  evolucaoDiaria: { data: string; prejuizo: number }[];

  analiseDesperdicio?: AnaliseDesperdicio;

};



function moeda(valor: number) {

  return valor.toLocaleString("pt-BR", {

    style: "currency",

    currency: "BRL",

  });

}



function peso(valor: number) {

  return `${valor.toLocaleString("pt-BR", {

    maximumFractionDigits: 3,

  })} kg`;

}



function Sidebar() {

  const router = useRouter();
  const [perfil, setPerfil] = useState<{ nome: string; empresaNome: string; papel: string } | null>(null);

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const resposta = await apiFetch("/auth/sessao");
        if (!resposta.ok) return;
        const dados = await resposta.json();
        setPerfil({
          nome: dados.usuario?.nome ?? "Administrador",
          empresaNome: dados.usuario?.empresaNome ?? "Minha empresa",
          papel: dados.usuario?.papel === "ADMIN" ? "Administrador" : "Usuário",
        });
      } catch {
        setPerfil(null);
      }
    }
    carregarPerfil();
  }, []);

  async function sair() {
    await logout();
    router.replace("/login");
  }

  return (

    <aside className="sidebar">

      <Link href="/" className="brand">

        <span className="brand-mark">s.</span>

        <span>

          SOBRA<span className="brand-dot">.</span>

          <small>INTELIGÊNCIA OPERACIONAL</small>

        </span>

      </Link>



      <div className="workspace">

        <div className="workspace-icon">{perfil?.empresaNome?.trim().charAt(0).toUpperCase() || "S"}</div>

        <div>

          <strong>{perfil?.empresaNome ?? "Rede Sabor"}</strong>

          <small>Plano profissional</small>

        </div>

        <ChevronDown size={16} />

      </div>



      <p className="nav-label">MENU PRINCIPAL</p>

      <nav className="nav-list">

        <Link className="nav-item active" href="/">

          <LayoutDashboard size={18} /> Visão geral

        </Link>

        <Link className="nav-item" href="/registros">

          <Camera size={18} /> Registrar descarte

        </Link>

        <Link className="nav-item" href="/unidades">

          <MapPin size={18} /> Unidades

        </Link>

        <Link className="nav-item" href="/relatorios">

          <ClipboardList size={18} /> Histórico de descartes

        </Link>

        <Link className="nav-item" href="/metas">

          <Target size={18} /> Metas de desperdício

        </Link>

        <Link className="nav-item" href="/alertas">

          <Bell size={18} /> Alertas inteligentes

        </Link>

        <Link className="nav-item" href="/alertas">

          <Lightbulb size={18} /> Inteligência Sobra

        </Link>

      </nav>



      <p className="nav-label second-label">GESTÃO</p>

      <nav className="nav-list">

        <Link className="nav-item" href="/alimentos">

          <Package size={18} /> Alimentos e custos

        </Link>

        <Link className="nav-item" href="/relatorios">

          <Wallet size={18} /> Relatórios

        </Link>

      </nav>



      <div className="sidebar-bottom">


        <div className="profile">

          <div className="avatar">{perfil?.nome?.trim().split(/\s+/).map((parte) => parte[0]).join("").slice(0, 2).toUpperCase() || "A"}</div>

          <div>

            <strong>{perfil?.nome ?? "Administrador"}</strong>

            <small>{perfil?.papel ?? "Administrador"}</small>

          </div>

          <button className="profile-logout" type="button" onClick={sair} title="Sair">
            <LogOut size={16} />
          </button>

        </div>

      </div>

    </aside>

  );

}



function Metric({

  label, value, change, positive, icon: Icon, note,

}: {

  label: string;

  value: string;

  change: string;

  positive: boolean;

  icon: React.ElementType;

  note: string;

}) {

  return (

    <article className="metric-card">

      <div className="metric-top">

        <span>{label}</span>

        <span className="metric-icon"><Icon size={18} /></span>

      </div>

      <div className="metric-value">{value}</div>

      <div className="metric-bottom">

        {change ? (

          <span className={positive ? "trend good" : "trend bad"}>

            {positive ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}

            {" "}{change}

          </span>

        ) : null}

        <span>{note}</span>

      </div>

    </article>

  );

}



function Dashboard() {

  const [dados, setDados] = useState<DashboardData | null>(null);

  const [erro, setErro] = useState("");
  const [metaResumo, setMetaResumo] = useState<{ metaGeral: number | null; desperdicioGeral: number } | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("Administrador");
  const [iniciaisUsuario, setIniciaisUsuario] = useState("A");
  const [alertasResumo, setAlertasResumo] = useState<{
    titulo: string;
    descricao: string;
    severidade: "atencao" | "critico";
    dados: Record<string, number | string>;
    recomendacao: string;
  }[]>([]);



  useEffect(() => {

    async function carregarDashboard() {

      try {

        const resposta = await apiFetch("/api/dashboard");

        if (!resposta.ok) throw new Error("Erro ao carregar indicadores.");

        const resultado: DashboardData = await resposta.json();

        setDados(resultado);

      } catch {

        setErro("Não foi possível carregar os dados do dashboard.");

      }

    }

    async function carregarMeta() {
      const agora = new Date();
      try {
        const resposta = await apiFetch(`/api/metas?ano=${agora.getFullYear()}&mes=${agora.getMonth() + 1}`);
        if (resposta.ok) {
          const resultado = await resposta.json();
          setMetaResumo({
            metaGeral: resultado.metaGeral,
            desperdicioGeral: resultado.desperdicioGeral,
          });
        }
      } catch {
        setMetaResumo(null);
      }
    }

    async function carregarPerfil() {
      try {
        const resposta = await apiFetch("/auth/sessao");
        if (!resposta.ok) return;
        const resultado = await resposta.json();
        const nome = typeof resultado.usuario?.nome === "string" && resultado.usuario.nome.trim()
          ? resultado.usuario.nome.trim()
          : "Administrador";
        setNomeUsuario(nome);
        setIniciaisUsuario(nome.split(/\s+/).map((parte: string) => parte[0]).join("").slice(0, 2).toUpperCase());
      } catch {
        setNomeUsuario("Administrador");
        setIniciaisUsuario("A");
      }
    }

    async function carregarAlertas() {
      try {
        const resposta = await apiFetch("/api/alertas");
        if (resposta.ok) {
          const resultado = await resposta.json();
          setAlertasResumo((resultado.alertas ?? []).slice(0, 3));
        }
      } catch {
        setAlertasResumo([]);
      }
    }

    carregarDashboard();
    carregarMeta();
    carregarPerfil();
    carregarAlertas();

  }, []);



  if (erro) return <main style={{ padding: 40 }}>{erro}</main>;

  if (!dados) return <main style={{ padding: 40 }}>Carregando dashboard...</main>;



  const maiorPrejuizo = Math.max(

    ...dados.desperdicioPorUnidade.map((u) => u.prejuizo), 0

  );



  const unidadesReais = dados.desperdicioPorUnidade.map((u) => ({

    id: u.id,

    name: u.nome,

    amount: moeda(u.prejuizo),

    width: maiorPrejuizo > 0 ? `${(u.prejuizo / maiorPrejuizo) * 100}%` : "0%",

  }));



  const registrosReais = dados.ultimosDescartes.map((r) => ({

    id: r.id,

    food: r.alimento,

    detail: r.unidade,

    reason: r.motivo,

    qty: peso(r.quantidadeKg),

    cost: moeda(r.custoTotal),

    color: "leaf",

  }));



  const analise = dados.analiseDesperdicio;



  return (

    <div className="app-shell">

      <Sidebar />

      <main className="main-content">

        <header className="topbar">

          <div className="breadcrumb">Painel <span>/</span> <strong>Visão geral</strong></div>

          <div className="top-actions">

            <button className="icon-button" aria-label="Buscar"><Search size={18} /></button>

            <button className="icon-button notification" aria-label="Notificações">

              <Bell size={18} /><i />

            </button>

            <div className="top-user"><div className="avatar small">{iniciaisUsuario}</div><ChevronDown size={15} /></div>

          </div>

        </header>



        <section className="page-heading">

          <div>

            <p className="eyebrow">PAINEL DE INTELIGÊNCIA OPERACIONAL</p>

            <h1>Olá, {nomeUsuario.split(/\s+/)[0]} <span>✳</span></h1>

            <p className="subheading">Aqui está o resumo da operação da sua rede.</p>

          </div>

          <div className="heading-actions">

            <span className="outline-button">

              <span className="status-dot" /> Visão geral

            </span>

            <Link href="/registros" className="primary-button">

              <Camera size={17} /> Novo descarte

            </Link>

          </div>

        </section>



        {alertasResumo.length > 0 && (
          <section className="alerts-dashboard-summary">
            <div className="alerts-dashboard-heading">
              <div><span>Monitoramento inteligente</span><strong>Principais alertas</strong></div>
              <Link href="/alertas">Ver todos <ArrowUpRight size={14} /></Link>
            </div>
            <div className="alerts-dashboard-list">
              {alertasResumo.map((alerta, indice) => {
                const dadoPrincipal = typeof alerta.dados?.desperdicio === "number"
                  ? `Desperdício ${moeda(alerta.dados.desperdicio)}`
                  : typeof alerta.dados?.participacaoPercentual === "number"
                    ? `Participação ${alerta.dados.participacaoPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
                    : typeof alerta.dados?.crescimentoPercentual === "number"
                      ? `Crescimento ${alerta.dados.crescimentoPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
                      : "Dados disponíveis";

                return (
                  <Link href="/alertas" className={`alerts-dashboard-item ${alerta.severidade}`} key={`${alerta.titulo}-${indice}`}>
                    <div className="alerts-dashboard-item-head">
                      <span>{alerta.severidade === "critico" ? "Crítico" : "Atenção"}</span>
                      <small>{dadoPrincipal}</small>
                    </div>
                    <strong>{alerta.titulo}</strong>
                    {alerta.recomendacao && <p>{alerta.recomendacao}</p>}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {metaResumo && (() => {
          const porcentagem = metaResumo.metaGeral && metaResumo.metaGeral > 0
            ? (metaResumo.desperdicioGeral / metaResumo.metaGeral) * 100
            : 0;
          const estado = !metaResumo.metaGeral
            ? "sem-meta"
            : porcentagem >= 100
              ? "vermelho"
              : porcentagem >= 70
                ? "amarelo"
                : "verde";

          return (
            <section className="goal-dashboard-summary">
              <div className="goal-dashboard-heading">
                <div><span>Meta mensal de desperdício</span><strong>{metaResumo.metaGeral == null ? "Não definida" : moeda(metaResumo.metaGeral)}</strong></div>
                <Link href="/metas">Ver metas <ArrowUpRight size={14} /></Link>
              </div>
              <div className="goal-dashboard-progress">
                <div className="goal-dashboard-values">
                  <span>Acumulado <strong>{moeda(metaResumo.desperdicioGeral)}</strong></span>
                  <span>{metaResumo.metaGeral ? `${porcentagem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% utilizado` : "Configure uma meta"}</span>
                </div>
                <div className="goal-dashboard-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(porcentagem, 100)}>
                  <i className={estado} style={{ width: metaResumo.metaGeral ? `${Math.min(porcentagem, 100)}%` : "0%" }} />
                </div>
              </div>
            </section>
          );
        })()}

        <section className="metrics-grid">

          <Metric label="Desperdício financeiro" value={moeda(dados.prejuizoTotal)} change="" positive icon={Wallet} note="Total registrado" />

          <Metric label="Alimentos descartados" value={peso(dados.quantidadeTotal)} change="" positive icon={Utensils} note="Total registrado" />

          <Metric label="Registros realizados" value={String(dados.totalRegistros)} change="" positive icon={ClipboardList} note="Descartes cadastrados" />

          <Metric label="Unidades monitoradas" value={String(dados.totalUnidades)} change="" positive icon={MapPin} note="Unidades cadastradas" />

        </section>



        <section className="content-grid">

          <article className="panel waste-panel">

            <div className="panel-heading">

              <div>

                <h2>Evolução do desperdício</h2>

                <p>Valor descartado ao longo dos últimos 30 dias</p>

              </div>

              <span className="select-button">Financeiro</span>

            </div>

            <GraficoDesperdicio dados={dados.evolucaoDiaria} />

          </article>



          <article className="panel units-panel" id="unidades">

            <div className="panel-heading">

              <div><h2>Desperdício por unidade</h2><p>Onde sua rede mais perde</p></div>

            </div>

            <div className="unit-list">

              {unidadesReais.map((unit) => (

                <div className="unit-row" key={unit.id}>

                  <div className="unit-info"><span>{unit.name}</span><strong>{unit.amount}</strong></div>

                  <div className="unit-bar"><i style={{ width: unit.width }} /></div>

                </div>

              ))}

            </div>

            <Link className="text-link" href="/unidades">Ver todas as unidades <ArrowUpRight size={14} /></Link>

          </article>

        </section>



        <section className="panel ranking-panel" id="ranking-alimentos" style={{ marginTop: 20 }}>
          <div className="panel-heading">
            <div><h2>Ranking de alimentos por prejuízo</h2><p>Alimentos que mais geraram perdas financeiras — todo o histórico</p></div>
            <Link href="/relatorios" className="text-link">Ver relatório <ArrowUpRight size={14} /></Link>
          </div>
          {dados.analiseDesperdicio?.rankingAlimentos?.length ? (
            <div className="ranking-list">
              {dados.analiseDesperdicio.rankingAlimentos.map((alimento, indice) => (
                <div className="ranking-row" key={alimento.nome}>
                  <span className="ranking-position">{indice + 1}º</span>
                  <div className="ranking-details">
                    <div className="unit-info"><span>{alimento.nome}</span><strong>{moeda(alimento.prejuizo)}</strong></div>
                    <div className="unit-bar"><i style={{ width: `${dados.prejuizoTotal > 0 ? (alimento.prejuizo / dados.prejuizoTotal) * 100 : 0}%` }} /></div>
                    <small>{peso(alimento.quantidadeKg)} · {alimento.registros} registro(s) · {dados.prejuizoTotal > 0 ? ((alimento.prejuizo / dados.prejuizoTotal) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0"}% das perdas</small>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="subheading">Ainda não há descartes para classificar.</p>}
        </section>

        <section className="bottom-grid">

          <article className="panel records-panel" id="registros">

            <div className="panel-heading">

              <div><h2>Últimos descartes</h2><p>Registros recentes da sua rede</p></div>

              <Link href="/registros" className="text-link">Novo registro <ArrowUpRight size={14} /></Link>

            </div>

            <div className="table-wrap">

              <table>

                <thead>

                  <tr><th>ALIMENTO</th><th>MOTIVO</th><th>QUANTIDADE</th><th>PREJUÍZO</th></tr>

                </thead>

                <tbody>

                  {registrosReais.map((record) => (

                    <tr key={record.id}>

                      <td>

                        <div className="food-cell">

                          <span className={`food-thumb ${record.color}`}>{record.food.slice(0, 1)}</span>

                          <span><strong>{record.food}</strong><small>{record.detail}</small></span>

                        </div>

                      </td>

                      <td>{record.reason}</td>

                      <td>{record.qty}</td>

                      <td className="cost-cell">{record.cost}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </article>



                      <article className="insight-card" id="analises">
              <div className="insight-icon"><Lightbulb size={19} /></div>
              <p className="eyebrow">INTELIGÊNCIA SOBRA</p>
              <h2>Transforme dados em decisões.</h2>

              {analise?.alimentoCritico ? (
                <>
                  <p>
                    <strong>{analise.alimentoCritico.nome}</strong> é o alimento
                    com maior prejuízo registrado, representando{" "}
                    <strong>
                      {dados.prejuizoTotal > 0
                        ? ((analise.alimentoCritico.prejuizo / dados.prejuizoTotal) * 100)
                            .toLocaleString("pt-BR", { maximumFractionDigits: 1 })
                        : "0"}%
                    </strong>{" "}
                    das perdas financeiras ({moeda(analise.alimentoCritico.prejuizo)}).
                  </p>

                  <div className="insight-divider" />

                  <p className="insight-action">
                    <strong>Principal motivo por prejuízo:</strong><br />
                    {analise.motivoPrincipal?.motivo ?? "Não identificado"}
                    {analise.motivoPrincipal
                      ? ` — ${moeda(analise.motivoPrincipal.prejuizo)}`
                      : ""}
                  </p>

                  <p className="insight-action" style={{ marginTop: "12px" }}>
                    <strong>O que fazer?</strong><br />
                    {analise.recomendacao}
                  </p>
                </>
              ) : (
                <p>
                  Registre descartes para identificar os alimentos com maior
                  impacto financeiro e receber recomendações baseadas nos dados
                  da operação.
                </p>
              )}

              <Link href="/registros" className="insight-link">
                Registrar descarte <ArrowUpRight size={14} />
              </Link>
            </article>

        </section>



        <footer className="footer">

          <span>© 2026 Sobra Tecnologia</span>

          <span>Ambiente de desenvolvimento</span>

        </footer>

      </main>

    </div>

  );

}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
