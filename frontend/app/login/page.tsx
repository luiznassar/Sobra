"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Leaf, Loader2, LogIn } from "lucide-react";
import { apiFetch, configurarCsrf } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const resposta = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível entrar.");
      }

      configurarCsrf(dados.csrfToken);
      router.replace("/");
      router.refresh();
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/login" className="auth-brand" aria-label="Sobra">
          <span className="brand-mark">s.</span>
          <span>SOBRA<span className="brand-dot">.</span><small>INTELIGÊNCIA OPERACIONAL</small></span>
        </Link>

        <div className="auth-heading">
          <p className="eyebrow">ACESSO À OPERAÇÃO</p>
          <h1>Bem-vindo de volta</h1>
          <p>Entre para acompanhar os desperdícios da sua empresa.</p>
        </div>

        <form className="auth-form" onSubmit={entrar}>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} required />

          {erro && <p className="auth-error" role="alert">{erro}</p>}

          <button className="auth-submit" type="submit" disabled={carregando}>
            {carregando ? <Loader2 className="spin" size={17} /> : <LogIn size={17} />}
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-footer">Ainda não tem uma empresa cadastrada? <Link href="/cadastro">Criar conta</Link></p>
        <Leaf className="auth-leaf" size={24} aria-hidden="true" />
      </section>
    </main>
  );
}
