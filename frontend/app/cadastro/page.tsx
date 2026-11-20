"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Loader2, UserPlus } from "lucide-react";
import { apiFetch, configurarCsrf } from "../../lib/api";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setCarregando(true);

    try {
      const resposta = await apiFetch("/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, nomeEmpresa }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível criar a conta.");
      }

      configurarCsrf(dados.csrfToken);
      router.replace("/");
      router.refresh();
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não foi possível criar a conta.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link href="/login" className="auth-brand" aria-label="Sobra">
          <span className="brand-mark">s.</span>
          <span>SOBRA<span className="brand-dot">.</span><small>INTELIGÊNCIA OPERACIONAL</small></span>
        </Link>

        <div className="auth-heading">
          <p className="eyebrow">NOVA OPERAÇÃO</p>
          <h1>Crie sua empresa no Sobra</h1>
          <p>Seu cadastro cria automaticamente uma empresa exclusiva para os seus dados.</p>
        </div>

        <form className="auth-form auth-grid" onSubmit={cadastrar}>
          <div>
            <label htmlFor="nome">Seu nome</label>
            <input id="nome" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" required />
          </div>
          <div>
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          <div>
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" value={senha} onChange={(event) => setSenha(event.target.value)} autoComplete="new-password" minLength={8} required />
          </div>
          <div>
            <label htmlFor="nomeEmpresa">Nome da empresa</label>
            <input id="nomeEmpresa" value={nomeEmpresa} onChange={(event) => setNomeEmpresa(event.target.value)} required />
          </div>

          {erro && <p className="auth-error auth-error-full" role="alert">{erro}</p>}

          <button className="auth-submit auth-submit-full" type="submit" disabled={carregando}>
            {carregando ? <Loader2 className="spin" size={17} /> : <UserPlus size={17} />}
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="auth-footer"><Building2 size={15} /> Já possui uma conta? <Link href="/login">Entrar</Link></p>
      </section>
    </main>
  );
}
