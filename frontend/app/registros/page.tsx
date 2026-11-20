
"use client";

import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import { apiFetch } from "../../lib/api";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Leaf,
  Loader2,
  Sparkles,
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

type IdentificacaoIA = {
  alimento: string | null;
  confianca: "alta" | "media" | "baixa";
  observacao: string;
};

function NovoRegistro() {
  const [preview, setPreview] = useState<string | null>(null);
  const [imagem, setImagem] = useState<File | null>(null);

  const [food, setFood] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Preparo excessivo");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [analisando, setAnalisando] = useState(false);

  const [resultadoIA, setResultadoIA] =
    useState<IdentificacaoIA | null>(null);

  const [units, setUnits] = useState<Unidade[]>([]);
  const [foods, setFoods] = useState<Alimento[]>([]);

  const identificacaoAtual = useRef(0);

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

        const unidades: Unidade[] = await resUnidades.json();
        const alimentos: Alimento[] = await resAlimentos.json();

        setUnits(unidades);
        setFoods(alimentos);
      } catch {
        setMessage(
          "Não foi possível carregar os dados do servidor."
        );
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    if (!imagem) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(imagem);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imagem]);

  const unidadeSelecionada = units.find(
    (item) => item.id === unit
  );

  const alimentosDaUnidade = foods.filter(
    (alimento) =>
      unidadeSelecionada &&
      alimento.empresaId === unidadeSelecionada.empresaId
  );

  function handleFile(file?: File) {
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      )
    ) {
      setMessage("Selecione uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 5 MB.");
      return;
    }

    identificacaoAtual.current += 1;
    setImagem(file);
    setResultadoIA(null);
    setMessage("");
  }

  async function identificarComIA() {
    if (!imagem) {
      setMessage("Selecione uma fotografia primeiro.");
      return;
    }

    const numeroIdentificacao =
      ++identificacaoAtual.current;

    setAnalisando(true);
    setResultadoIA(null);
    setMessage("");

    try {
      const formulario = new FormData();
      formulario.append("imagem", imagem);

      const resposta = await apiFetch(
        "/api/identificar-alimento",
        {
          method: "POST",
          body: formulario,
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível analisar a imagem."
        );
      }

      if (
        numeroIdentificacao !==
        identificacaoAtual.current
      ) {
        return;
      }

      const identificacao: IdentificacaoIA = {
        alimento:
          typeof dados.alimento === "string"
            ? dados.alimento
            : null,
        confianca: dados.confianca,
        observacao: dados.observacao,
      };

      setResultadoIA(identificacao);

      if (!identificacao.alimento) {
        setMessage(
          "A IA não conseguiu identificar o alimento. Selecione-o manualmente."
        );
        return;
      }

      // Procura o alimento reconhecido no cadastro
      // da empresa associada à unidade selecionada.
      const nomeIdentificado =
        identificacao.alimento.toLocaleLowerCase("pt-BR").trim();

      const alimentoEncontrado = alimentosDaUnidade.find(
        (alimento) =>
          alimento.nome
            .toLocaleLowerCase("pt-BR")
            .trim() === nomeIdentificado
      );

      if (alimentoEncontrado) {
        setFood(alimentoEncontrado.id);
        setMessage(
          "Alimento encontrado no cadastro! Confira a seleção antes de registrar."
        );
      } else {
        setMessage(
          "A IA identificou o alimento, mas não encontrou uma correspondência exata no cadastro da unidade. Selecione o alimento manualmente."
        );
      }
    } catch (erro) {
      if (
        numeroIdentificacao !==
        identificacaoAtual.current
      ) {
        return;
      }

      setMessage(
        erro instanceof Error
          ? erro.message
          : "Não foi possível identificar o alimento."
      );
    } finally {
      if (
        numeroIdentificacao ===
        identificacaoAtual.current
      ) {
        setAnalisando(false);
      }
    }
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!unit || !food || !quantity) {
      setMessage("Preencha todos os campos obrigatórios.");
      return;
    }

    const quantidade = Number(quantity);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setMessage("Informe uma quantidade válida.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const resposta = await apiFetch(
        "/descartes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unidadeId: unit,
            alimentoId: food,
            quantidadeKg: quantidade,
            motivo: reason,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Erro ao registrar descarte."
        );
      }

      const custo = Number(
        dados.custoTotal
      ).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      setMessage(
        `Descarte registrado com sucesso! Prejuízo calculado: ${custo}`
      );

      identificacaoAtual.current += 1;
      setFood("");
      setQuantity("");
      setReason("Preparo excessivo");
      setImagem(null);
      setResultadoIA(null);
      setAnalisando(false);
    } catch (erro) {
      setMessage(
        erro instanceof Error
          ? erro.message
          : "Não foi possível registrar o descarte."
      );
    } finally {
      setLoading(false);
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
          OPERAÇÃO / NOVO REGISTRO
        </p>

        <h1>Registrar descarte</h1>

        <p className="subheading">
          Registre o alimento descartado para acompanhar
          as perdas da sua unidade.
        </p>

        <form
          className="register-card"
          onSubmit={submit}
        >
          <div className="form-section-title">
            <span className="step-number">1</span>

            <div>
              <h2>Fotografia do descarte</h2>
              <p>
                Adicione uma imagem para identificar
                o alimento com inteligência artificial.
              </p>
            </div>
          </div>

          <label className="upload-area">
            {preview ? (
              <img
                src={preview}
                alt="Prévia do alimento descartado"
              />
            ) : (
              <>
                <span className="upload-icon">
                  <ImagePlus size={24} />
                </span>

                <strong>
                  Adicione uma fotografia
                </strong>

                <span>
                  Clique para selecionar uma imagem
                </span>

                <small>
                  PNG, JPG ou WEBP · até 5 MB
                </small>
              </>
            )}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              onChange={(e) =>
                handleFile(e.target.files?.[0])
              }
            />
          </label>

          {imagem && (
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={identificarComIA}
                disabled={analisando || loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  padding: "13px 18px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#173C2C",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: analisando
                    ? "wait"
                    : "pointer",
                  opacity: analisando ? 0.7 : 1,
                }}
              >
                {analisando ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={17} />
                )}

                {analisando
                  ? "Analisando fotografia..."
                  : "Identificar alimento com IA"}
              </button>

              {resultadoIA && (
                <div
                  style={{
                    background: "#F0F8F2",
                    border: "1px solid #D7EBDD",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#258653",
                      fontWeight: 700,
                      fontSize: "12px",
                    }}
                  >
                    <Sparkles size={16} />
                    RESULTADO DA INTELIGÊNCIA ARTIFICIAL
                  </div>

                  <strong
                    style={{
                      color: "#173C2C",
                      fontSize: "20px",
                    }}
                  >
                    {resultadoIA.alimento ||
                      "Alimento não identificado"}
                  </strong>

                  <span
                    style={{
                      color: "#667A6D",
                      fontSize: "12px",
                    }}
                  >
                    Confiança informada pela IA:{" "}
                    {resultadoIA.confianca}
                  </span>

                  <p
                    style={{
                      color: "#53685B",
                      fontSize: "13px",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {resultadoIA.observacao}
                  </p>

                  <small
                    style={{
                      color: "#667A6D",
                    }}
                  >
                    Confira o alimento selecionado antes
                    de confirmar o descarte.
                  </small>
                </div>
              )}
            </div>
          )}

          <div className="form-section-title second">
            <span className="step-number">2</span>

            <div>
              <h2>Informações do descarte</h2>
              <p>
                Confirme os dados para calcular
                o impacto financeiro.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field full">
              <span>Unidade</span>

              <select
                required
                value={unit}
                onChange={(e) => {
                  identificacaoAtual.current += 1;
                  setUnit(e.target.value);
                  setFood("");
                  setResultadoIA(null);
                  setAnalisando(false);
                }}
              >
                <option value="">
                  Selecione uma unidade
                </option>

                {units.map((unidade) => (
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
              <span>Alimento</span>

              <select
                required
                value={food}
                onChange={(e) =>
                  setFood(e.target.value)
                }
              >
                <option value="">
                  Selecione um alimento
                </option>

                {alimentosDaUnidade.map(
                  (alimento) => (
                    <option
                      key={alimento.id}
                      value={alimento.id}
                    >
                      {alimento.nome}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="field">
              <span>Quantidade (kg)</span>

              <input
                required
                min="0.001"
                step="0.001"
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                placeholder="Ex.: 2.5"
              />
            </label>

            <label className="field full">
              <span>Motivo do descarte</span>

              <select
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
              >
                <option>Preparo excessivo</option>
                <option>Vencimento</option>
                <option>Deterioração</option>
                <option>Sobra de produção</option>
                <option>Erro no preparo</option>
                <option>Outro</option>
              </select>
            </label>
          </div>

          <div className="form-note">
            <Leaf size={17} />

            <span>
              O custo será calculado automaticamente
              com base no valor por kg cadastrado
              para o alimento.
            </span>
          </div>

          {message && (
            <div
              className="form-message"
              role="status"
            >
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          <div className="form-actions">
            <Link
              href="/"
              className="cancel-button"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="primary-button"
              disabled={loading || analisando}
            >
              <Camera size={17} />

              {loading
                ? "Registrando..."
                : "Confirmar registro"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function NovoRegistroPage() {
  return (
    <AuthGuard>
      <NovoRegistro />
    </AuthGuard>
  );
}
