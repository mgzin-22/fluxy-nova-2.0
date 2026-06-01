const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const prisma = new PrismaClient();

const SECRET = process.env.JWT_SECRET || "fluxy_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5500/frontend";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        error: "Preencha nome, e-mail e senha."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "A senha deve ter no mínimo 6 caracteres."
      });
    }

    const userExists = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (userExists) {
      return res.status(400).json({
        error: "Email já existe"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword
      }
    });

    const { password: _, resetToken, resetTokenExpires, ...safeUser } = user;

    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        error: "Informe e-mail e senha."
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return res.status(400).json({
        error: "Usuário não encontrado"
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({
        error: "Senha inválida"
      });
    }

    const token = jwt.sign(
      {
        userId: user.id
      },
      SECRET,
      {
        expiresIn: "7d"
      }
    );

    const { password: _, resetToken, resetTokenExpires, ...safeUser } = user;

    res.json({
      token,
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// ESQUECI MINHA SENHA — MODO TESTE/APRESENTAÇÃO
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        error: "Informe o e-mail cadastrado."
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return res.status(404).json({
        error: "Nenhuma conta encontrada com este e-mail."
      });
    }

    const rawToken = createResetToken();
    const hashedToken = hashResetToken(rawToken);

    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        resetToken: hashedToken,
        resetTokenExpires: expires
      }
    });

    const resetLink = `${FRONTEND_URL}/reset-password.html?token=${rawToken}&id=${user.id}`;

    res.json({
  message: "Link de recuperação gerado com sucesso.",
  resetLink
});
  } catch (error) {
    console.error("Erro forgot-password:", error);

    res.status(500).json({
      error: "Não foi possível gerar o link de recuperação."
    });
  }
});

// REDEFINIR SENHA
router.post("/reset-password", async (req, res) => {
  try {
    const { userId, token, password } = req.body;

    if (!userId || !token || !password) {
      return res.status(400).json({
        error: "Informe o token, usuário e a nova senha."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "A nova senha deve ter no mínimo 6 caracteres."
      });
    }

    const hashedToken = hashResetToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        resetToken: hashedToken,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: "Link inválido ou expirado. Solicite uma nova recuperação."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    res.json({
      message: "Senha redefinida com sucesso. Faça login novamente."
    });
  } catch (error) {
    console.error("Erro reset-password:", error);

    res.status(500).json({
      error: "Não foi possível redefinir a senha."
    });
  }
});

module.exports = router;