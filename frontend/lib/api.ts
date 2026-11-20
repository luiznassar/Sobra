export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
).replace(/\/$/, "");

let csrfToken: string | null = null;

export function configurarCsrf(token: string | null) {
  csrfToken = token;
}

export async function apiFetch(
  caminho: string,
  opcoes: RequestInit = {}
): Promise<Response> {
  const metodo = (opcoes.method || "GET").toUpperCase();
  const headers = new Headers(opcoes.headers);

  if (!["GET", "HEAD", "OPTIONS"].includes(metodo) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers,
    credentials: "include",
  });
}

export async function consultarSessao() {
  const resposta = await apiFetch("/auth/sessao");
  if (!resposta.ok) {
    configurarCsrf(null);
    return null;
  }

  const dados = await resposta.json();
  configurarCsrf(dados.csrfToken || null);
  return dados;
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" });
  configurarCsrf(null);
}
