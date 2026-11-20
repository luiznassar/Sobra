
import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!formatosPermitidos.includes(file.mimetype)) {
      return callback(
        new Error("Envie uma imagem JPG, PNG ou WEBP.")
      );
    }

    callback(null, true);
  },
});

router.post(
  "/",
  (req, res, next) => {
    upload.single("imagem")(req, res, (erro) => {
      if (erro) {
        return res.status(400).json({
          erro:
            erro instanceof multer.MulterError &&
            erro.code === "LIMIT_FILE_SIZE"
              ? "A imagem deve ter no máximo 5 MB."
              : erro.message || "Imagem inválida.",
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          erro: "Nenhuma imagem foi enviada.",
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          erro: "A chave da OpenAI não está configurada.",
        });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const imagemBase64 = req.file.buffer.toString("base64");

      const imagemUrl =
        `data:${req.file.mimetype};base64,${imagemBase64}`;

      const resposta = await openai.responses.create({
        model: "gpt-4.1-mini",
        max_output_tokens: 180,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Analise a fotografia enviada e identifique o principal
alimento visível.

Responda SOMENTE com um objeto JSON válido,
sem markdown, usando este formato:

{
  "alimento": "nome do alimento ou null",
  "confianca": "alta, media ou baixa",
  "observacao": "explicação curta"
}

Regras:
- Use nomes comuns de alimentos em português brasileiro.
- Não invente um alimento se a imagem não permitir identificá-lo.
- Se não houver alimento identificável, use null no campo alimento.
- Não estime peso, quantidade em kg, preço ou validade.
- A identificação deve ser tratada como sugestão.
                `.trim(),
              },
              {
                type: "input_image",
                image_url: imagemUrl,
                detail: "low",
              },
            ],
          },
        ],
      });

      const texto = resposta.output_text.trim();

      let identificacao;

      try {
        identificacao = JSON.parse(texto);
      } catch {
        return res.status(502).json({
          erro: "A IA retornou uma resposta inesperada.",
        });
      }

      const alimento =
        typeof identificacao.alimento === "string"
          ? identificacao.alimento.trim()
          : null;

      const confiancasPermitidas = [
        "alta",
        "media",
        "baixa",
      ];

      const confianca =
        confiancasPermitidas.includes(
          identificacao.confianca
        )
          ? identificacao.confianca
          : "baixa";

      return res.json({
        alimento: alimento || null,
        confianca,
        observacao:
          typeof identificacao.observacao === "string"
            ? identificacao.observacao
            : "Confira a identificação antes de registrar.",
      });
    } catch (erro) {
      console.error("Erro ao identificar alimento:", erro);

      return res.status(500).json({
        erro: "Não foi possível identificar o alimento.",
      });
    }
  }
);

export default router;
