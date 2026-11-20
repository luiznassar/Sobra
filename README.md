# Sobra — starter do projeto

Primeiro esqueleto do produto Sobra: dashboard demonstrativo, tela inicial de registro, API de saúde e schema inicial do banco.

## Requisitos
- Node.js 20 ou superior
- npm
- PostgreSQL (necessário quando formos conectar o banco)

## 1. Frontend
```bash
cd frontend
npm install
npm run dev
```
Acesse http://localhost:3000.

## 2. Backend (em outro terminal)
```bash
cd backend
npm install
npm run dev
```
Teste http://localhost:3333/health.

## 3. Banco de dados
O schema Prisma está em `database/schema.prisma`. Na próxima etapa vamos inicializar o Prisma, configurar `DATABASE_URL`, criar migrations e implementar os modelos e serviços.

## Estado atual
- Dashboard e tela de registro usam dados demonstrativos.
- Upload de imagem mostra prévia local; ainda não envia para storage nem chama IA.
- API possui somente rota de saúde.
- Schema Prisma é a primeira versão e ainda não foi migrado.

Não utilize dados demonstrativos como indicadores reais de uma operação.
