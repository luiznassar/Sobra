
"use client";

import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import { apiFetch } from "../../lib/api";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Leaf,
  Loader2,
  Plus,
} from "lucide-react";


type Unidade = {
  id: string;
  nome: string;
  empresaId: string;
};

type Alimento = {
  id: string;
  nome: string;
  empresaId: string;
  custoPorKg: string;
};

function CadastroAlimentos() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);

  const [unidadeId, setUnidadeId] = useState("");
  const [nome, setNome] = useState("");
  const [custo, setCusto] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDados() {
      try {
        const [resUnidades, resAlimentos] = await Promise.all([
          apiFetch("/api/unidades"),
          apiFetch("/api/alimentos"),
        ]);

        if (!resUnidades.ok || !resAlimentos.ok) {
          throw new Error("Erro ao carregar cadastros.");
        }

        const dadosUnidades: Unidade[] =
          await resUnidades.json();

        const dadosAlimentos: Alimento[] =
          await resAlimentos.json();

        setUnidades(dadosUnidades);
        setAlimentos(dadosAlimentos);

        if (dadosUnidades.length > 0) {
            setUnidadeId(dadosUnidades[0].id);
        }
      } catch {
        setErro("Não foi possível carregar os dados.");
      }
    }

    carregarDados();
  }, []);

  const unidadeSelecionada = unidades.find(
    (unidade) => unidade.id === unidadeId
  );

  const alimentosDaEmpresa = alimentos.filter(
    (alimento) =>
      unidadeSelecionada &&
      alimento.empresaId === unidadeSelecionada.empresaId
  );

  async function cadastrarAlimento(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensagem("");
    setErro("");

    if (!unidadeSelecionada) {
      setErro("Selecione uma unidade.");
      return;
    }

    const custoNumerico = Number(custo);

    if (
      !nome.trim() ||
      !custo.trim() ||
      !Number.isFinite(custoNumerico) ||
      custoNumerico < 0
    ) {
      setErro("Informe um nome e um custo válido.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await apiFetch(
        "/api/alimentos",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome: nome.trim(),
            custoPorKg: custoNumerico,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível cadastrar."
        );
      }

      setAlimentos((anteriores) =>
        [...anteriores, dados].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR")
        )
      );

      setNome("");
      setCusto("");

      setMensagem(
        `${dados.nome} cadastrado com sucesso!`
      );
    } catch (erro) {
      setErro(
        erro instanceof Error
          ? erro.message
          : "Não foi possível cadastrar o alimento."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="register-page">
      <header className="register-header">
        <Link href="/" className="brand">
          <span className="brand-mark">s.</span>

          <span>
            SOBRA<span className="brand-dot">.</span>
            <small>INTELIGÊNCIA OPERACIONAL</small>
          </span>
        </Link>

        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
      </header>

      <section className="register-container">
        <p className="eyebrow">
          GESTÃO / ALIMENTOS E CUSTOS
        </p>

        <h1>Cadastro de alimentos</h1>

        <p className="subheading">
          Cadastre os alimentos e seus custos para
          calcular automaticamente os prejuízos
          da sua operação.
        </p>

        <form
          className="register-card"
          onSubmit={cadastrarAlimento}
        >
          <div className="form-section-title">
            <span className="step-number">
              <Plus size={15} />
            </span>

            <div>
              <h2>Novo alimento</h2>
              <p>
                Informe os dados para adicionar
                um alimento ao cadastro.
              </p>
            </div>
          </div>

          <div
            className="form-grid"
            style={{ marginTop: "24px" }}
          >
            <label className="field full">
              <span>Unidade</span>

              <select
                required
                value={unidadeId}
                onChange={(event) => {
                  setUnidadeId(event.target.value);
                  setMensagem("");
                  setErro("");
                }}
              >
                <option value="">
                  Selecione uma unidade
                </option>

                {unidades.map((unidade) => (
                  <option
                    key={unidade.id}
                    value={unidade.id}
                  >
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Nome do alimento</span>

              <input
                required
                type="text"
                value={nome}
                onChange={(event) =>
                  setNome(event.target.value)
                }
                placeholder="Ex.: Banana"
              />
            </label>

            <label className="field">
              <span>Custo por kg (R$)</span>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={custo}
                onChange={(event) =>
                  setCusto(event.target.value)
                }
                placeholder="Ex.: 6.00"
              />
            </label>
          </div>

          <div className="form-note">
            <Leaf size={17} />

            <span>
              O alimento ficará disponível para
              as unidades da mesma empresa.
            </span>
          </div>

          {mensagem && (
            <div className="form-message" role="status">
              <CheckCircle2 size={17} />
              {mensagem}
            </div>
          )}

          {erro && (
            <p
              role="alert"
              style={{
                color: "#B42318",
                fontSize: "13px",
                marginTop: "12px",
              }}
            >
              {erro}
            </p>
          )}

          <div className="form-actions">
            <Link
              href="/registros"
              className="cancel-button"
            >
              Voltar aos registros
            </Link>

            <button
              type="submit"
              className="primary-button"
              disabled={salvando}
            >
              {salvando ? (
                <Loader2 size={17} />
              ) : (
                <Plus size={17} />
              )}

              {salvando
                ? "Cadastrando..."
                : "Cadastrar alimento"}
            </button>
          </div>
        </form>

        <div
          className="register-card"
          style={{ marginTop: "20px" }}
        >
          <div className="form-section-title">
            <span className="step-number">
              <Leaf size={15} />
            </span>

            <div>
              <h2>Alimentos cadastrados</h2>
              <p>
                Consulte os alimentos e seus custos.
              </p>
            </div>
          </div>

          {!unidadeSelecionada ? (
            <p
              style={{
                marginTop: "20px",
                color: "#667A6D",
                fontSize: "13px",
              }}
            >
              Selecione uma unidade acima para
              visualizar os alimentos da empresa.
            </p>
          ) : alimentosDaEmpresa.length === 0 ? (
            <p
              style={{
                marginTop: "20px",
                color: "#667A6D",
                fontSize: "13px",
              }}
            >
              Nenhum alimento cadastrado.
            </p>
          ) : (
            <div style={{ marginTop: "20px" }}>
              {alimentosDaEmpresa.map((alimento) => (
                <div
                  key={alimento.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 0",
                    borderBottom:
                      "1px solid #E7EEE9",
                  }}
                >
                  <strong
                    style={{
                      color: "#173C2C",
                      fontSize: "13px",
                    }}
                  >
                    {alimento.nome}
                  </strong>

                  <span
                    style={{
                      color: "#258653",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {Number(
                      alimento.custoPorKg
                    ).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                    /kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function CadastroAlimentosPage() {
  return (
    <AuthGuard>
      <CadastroAlimentos />
    </AuthGuard>
  );
}
