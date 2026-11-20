declare global {
  namespace Express {
    interface Request {
      usuarioAutenticado?: {
        id: string;
        nome: string;
        email: string;
        papel: string;
        empresaId: string;
        empresaNome: string;
        csrf: string;
      };
    }
  }
}

export {};
