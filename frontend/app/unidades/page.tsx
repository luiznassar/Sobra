"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import { apiFetch } from "../../lib/api";

type Unidade = {
  id: string;
  nome: string;
  empresaId: string;
  quantidadeDescartes: number;
  pesoTotalKg: number;
  prejuizoTotal: number;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function peso(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`;
}

function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await apiFetch("/api/unidades");
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar as unidades.");
      setUnidades(dados);
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não foi possível carregar as unidades.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const resposta = await apiFetch("/api/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível cadastrar a unidade.");
      setUnidades((atuais) => [...atuais, dados].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setNovoNome("");
      setMensagem(`${dados.nome} cadastrada com sucesso.`);
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não foi possível cadastrar a unidade.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(unidade: Unidade) {
    setEditandoId(unidade.id);
    setNomeEdicao(unidade.nome);
    setErro("");
    setMensagem("");
  }

  async function salvarEdicao(unidadeId: string) {
    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const resposta = await apiFetch(`/api/unidades/${unidadeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeEdicao }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível editar a unidade.");

      setUnidades((atuais) => atuais
        .map((unidade) => unidade.id === unidadeId ? { ...unidade, nome: dados.nome } : unidade)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setEditandoId(null);
      setMensagem("Nome da unidade atualizado.");
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não foi possível editar a unidade.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(unidade: Unidade) {
    if (!window.confirm(`Deseja excluir a unidade "${unidade.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setErro("");
    setMensagem("");

    try {
      const resposta = await apiFetch(`/api/unidades/${unidade.id}`, { method: "DELETE" });
      if (resposta.status !== 204) {
        const dados = await resposta.json();
        throw new Error(dados.erro || "Não foi possível excluir a unidade.");
      }

      setUnidades((atuais) => atuais.filter((item) => item.id !== unidade.id));
      setMensagem(`${unidade.nome} excluída com sucesso.`);
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não foi possível excluir a unidade.");
    }
  }

  return (
    <main className="register-page units-page">
      <header className="register-header">
        <Link href="/" className="brand">
          <span className="brand-mark">s.</span>
          <span>SOBRA<span className="brand-dot">.</span><small>INTELIGÊNCIA OPERACIONAL</small></span>
        </Link>
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar ao painel</Link>
      </header>

      <section className="register-container units-container">
        <p className="eyebrow">GESTÃO / UNIDADES</p>
        <h1>Unidades da empresa</h1>
        <p className="subheading">Cadastre e gerencie os locais monitorados pela sua operação.</p>

        <form className="units-create" onSubmit={cadastrar}>
          <label htmlFor="nova-unidade">Nome da unidade</label>
          <input
            id="nova-unidade"
            value={novoNome}
            onChange={(event) => setNovoNome(event.target.value)}
            placeholder="Ex.: Sabor Recife"
            required
          />
          <button className="units-primary" type="submit" disabled={salvando || !novoNome.trim()}>
            {salvando ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
            Cadastrar unidade
          </button>
        </form>

        {erro && <p className="units-message units-error" role="alert">{erro}</p>}
        {mensagem && <p className="units-message units-success" role="status">{mensagem}</p>}

        {carregando ? (
          <div className="units-state"><Loader2 className="spin" size={20} /> Carregando unidades...</div>
        ) : unidades.length === 0 ? (
          <div className="units-state units-empty">
            <Building2 size={28} />
            <strong>Nenhuma unidade cadastrada</strong>
            <span>Use o formulário acima para criar a primeira unidade.</span>
          </div>
        ) : (
          <div className="units-table-wrap">
            <table className="units-table">
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Descartes</th>
                  <th>Peso total</th>
                  <th>Prejuízo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((unidade) => (
                  <tr key={unidade.id}>
                    <td>
                      {editandoId === unidade.id ? (
                        <input
                          className="units-edit-input"
                          value={nomeEdicao}
                          onChange={(event) => setNomeEdicao(event.target.value)}
                          autoFocus
                        />
                      ) : (
                        <strong>{unidade.nome}</strong>
                      )}
                    </td>
                    <td>{unidade.quantidadeDescartes}</td>
                    <td>{peso(unidade.pesoTotalKg)}</td>
                    <td><strong>{moeda(unidade.prejuizoTotal)}</strong></td>
                    <td>
                      {editandoId === unidade.id ? (
                        <div className="units-actions">
                          <button type="button" className="units-save" onClick={() => salvarEdicao(unidade.id)} disabled={salvando || !nomeEdicao.trim()}>Salvar</button>
                          <button type="button" className="units-cancel" onClick={() => setEditandoId(null)}>Cancelar</button>
                        </div>
                      ) : (
                        <div className="units-actions">
                          <button type="button" className="units-icon" title={`Editar ${unidade.nome}`} onClick={() => iniciarEdicao(unidade)}><Pencil size={15} /></button>
                          <button type="button" className="units-icon units-delete" title={`Excluir ${unidade.nome}`} onClick={() => excluir(unidade)}><Trash2 size={15} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default function UnidadesPageGuard() {
  return <AuthGuard><UnidadesPage /></AuthGuard>;
}
