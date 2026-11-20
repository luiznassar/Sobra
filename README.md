# Sobra — Inteligência contra desperdício

O Sobra é uma plataforma operacional para monitorar, registrar e reduzir perdas financeiras de alimentos em empresas e unidades.

## Funcionalidades

- Cadastro e login seguros com cookie HttpOnly
- Dashboard com indicadores financeiros e evolução diária
- Gestão de unidades da empresa
- Cadastro de alimentos e custos por quilograma
- Registro de descartes com identificação por IA
- Relatórios e exportação CSV
- Metas gerais e metas por unidade
- Alertas inteligentes de meta, alimento crítico e aumento de desperdício
- Isolamento de dados por empresa autenticada

## Tecnologias

- Next.js 15 e React 19
- Express e TypeScript
- Prisma 5.22
- PostgreSQL
- JWT assinado com cookie HttpOnly
- bcrypt para hashes de senha
- OpenAI API para identificação de alimentos
- Recharts

## Estrutura

```text
frontend/   Aplicação Next.js
backend/    API Express/TypeScript
 database/   Schema e migrations Prisma
```

## Requisitos locais

- Node.js 20 ou superior
- npm
- PostgreSQL 14 ou superior
- Conta OpenAI opcional para reconhecimento por IA

## Configuração do PostgreSQL

Crie um banco local vazio no PostgreSQL:

```sql
CREATE DATABASE sobra;
```

A URL deve seguir este formato, sem inserir credenciais reais no repositório:

```text
postgresql://USUARIO:SENHA@localhost:5432/sobra?schema=public
```

Copie os modelos de ambiente:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

No Windows PowerShell, use:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Preencha os arquivos locais com os valores da sua máquina. Consulte os modelos sem conter credenciais reais.

## Variáveis de ambiente

Backend:

- `DATABASE_URL`: conexão PostgreSQL
- `SESSION_SECRET`: segredo persistente para assinar sessões
- `FRONTEND_URL`: origem autorizada do frontend
- `OPENAI_API_KEY`: chave opcional da API OpenAI
- `PORT`: porta da API; padrão local `3333`
- `NODE_ENV`: `development` ou `production`

Frontend:

- `NEXT_PUBLIC_API_URL`: URL pública ou local da API

## Instalação

Na raiz do projeto:

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

## Aplicar migrations localmente

Execute a partir da pasta `backend`:

```bash
cd backend
npx prisma migrate deploy --schema ../database/schema.prisma
npx prisma generate --schema ../database/schema.prisma
```

Em um novo banco, as três migrations existentes serão aplicadas nesta ordem:

1. Inicialização das empresas, unidades, alimentos e descartes
2. Criação da tabela de usuários
3. Criação das metas de desperdício

Não use `migrate reset` nem `db push` em bancos com dados existentes.

## Executar o projeto

Backend em um terminal:

```bash
cd backend
npm run dev
```

Frontend em outro terminal:

```bash
cd frontend
npm run dev
```

URLs locais:

- Frontend: http://localhost:3000
- API: http://localhost:3333
- Saúde da API: http://localhost:3333/health

## Build de produção

Backend:

```bash
cd backend
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm run build
npm start
```

## Primeira empresa e administrador

O cadastro público cria uma empresa nova automaticamente em `/cadastro`.

Para vincular o primeiro administrador à empresa de demonstração já existente, não use o cadastro público. A empresa deve ser vinculada pelo procedimento administrativo no backend.

O script requer o ID da empresa, nome e e-mail, enquanto a senha é fornecida por uma variável temporária do terminal:

```powershell
cd backend
$securePassword = Read-Host "Senha do administrador" -AsSecureString
$env:ADMIN_DEMO_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password

npm run vincular-admin-demo -- --empresa-id "ID_DA_EMPRESA" --nome "Nome do Administrador" --email "email@example.com"

Remove-Variable securePassword
Remove-Item Env:ADMIN_DEMO_PASSWORD
```

O script rejeita empresas que já possuam usuários vinculados e e-mails já cadastrados. Ele não altera unidades, alimentos ou descartes existentes.

Para redefinir a senha de um administrador existente:

```powershell
cd backend
$securePassword = Read-Host "Nova senha" -AsSecureString
$env:ADMIN_NEW_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password

npm run redefinir-senha-admin -- --email "email@example.com"

Remove-Variable securePassword
Remove-Item Env:ADMIN_NEW_PASSWORD
```

## Capturas de tela

Esta versão não possui uma pasta de capturas ou arquivos de imagem documentados no repositório. A seção pode ser preenchida após adicionar imagens em `docs/screenshots/`.

## Segurança do repositório

O repositório deve incluir apenas arquivos de código e modelos de ambiente. O `.gitignore` exclui:

- `.env` e variantes locais
- backups PostgreSQL
- chaves privadas e certificados
- `node_modules`, `.next` e `dist`

Antes do commit, confirme:

```bash
git status --short
git diff --stat
```

Não execute commit ou push até revisar os arquivos locais.

## Dificuldades comuns

- PostgreSQL precisa aceitar a URL configurada em `DATABASE_URL`.
- `SESSION_SECRET` deve ter pelo menos 32 caracteres em produção.
- Para portas diferentes da padrão, atualize `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` e CORS.
- A identificação por IA exige `OPENAI_API_KEY`.
- Em novos bancos vazios, aplique todas as migrations antes de iniciar o primeiro cadastro ou vínculo administrativo.
