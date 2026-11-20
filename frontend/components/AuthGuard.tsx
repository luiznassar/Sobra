"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { consultarSessao } from "../lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function verificar() {
      const sessao = await consultarSessao();
      if (!ativo) return;

      if (!sessao?.autenticado) {
        router.replace("/login");
        return;
      }

      setCarregando(false);
    }

    verificar();
    return () => {
      ativo = false;
    };
  }, [router]);

  if (carregando) {
    return (
      <main className="auth-page">
        <div className="auth-loading">Validando sessão...</div>
      </main>
    );
  }

  return <>{children}</>;
}
