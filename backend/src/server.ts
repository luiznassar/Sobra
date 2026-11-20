import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import healthRouter from "./routes/health";
import descartesRouter from "./routes/descartes";
import cadastrosRouter from "./routes/cadastros";
import dashboardRouter from "./routes/dashboard";
import relatoriosRouter from "./routes/relatorios";
import identificarAlimentoRoutes from "./routes/identificarAlimento";
import authRouter from "./routes/auth";
import metasRouter from "./routes/metas";
import alertasRouter from "./routes/alertas";
import { exigirAutenticacao } from "./middleware/autenticacao";


dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3333;

const origensPermitidas = (
  process.env.FRONTEND_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000")
)
  .split(/[;,]/)
  .map((origem) => origem.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && origensPermitidas.length === 0) {
  throw new Error("FRONTEND_URL é obrigatório em produção.");
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || origensPermitidas.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origem não autorizada pelo CORS."));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// Rotas da API
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/descartes", exigirAutenticacao, descartesRouter);
app.use("/api", exigirAutenticacao, cadastrosRouter);
app.use("/api/dashboard", exigirAutenticacao, dashboardRouter);
app.use("/api/relatorios", exigirAutenticacao, relatoriosRouter);
app.use("/api/metas", exigirAutenticacao, metasRouter);
app.use("/api/alertas", exigirAutenticacao, alertasRouter);
app.use("/api/identificar-alimento", exigirAutenticacao, identificarAlimentoRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Sobra API rodando em http://localhost:${port}`);
});
