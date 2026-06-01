const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

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

function createMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 465),
    secure: Number(process.env.EMAIL_PORT || 465) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendPasswordResetEmail({ to, name, resetLink }) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Configuração de e-mail não encontrada no servidor.");
  }

  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Fluxy <${process.env.EMAIL_USER}>`,
    to,
    subject: "Recuperação de senha - Fluxy",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f3f7ff; padding:28px;">
        <div style="max-width:560px; margin:auto; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #d9e2f2;">
          <div style="background:#0b1220; padding:24px;">
            <h1 style="margin:0; color:#ffffff; font-size:26px;">Fluxy</h1>
            <p style="margin:8px 0 0; color:#cde8ff;">O fluxo certo para o seu negócio.</p>
          </div>

          <div style="padding:26px; color:#0f172a;">
            <h2 style="margin-top:0;">Recuperação de senha</h2>

            <p>Olá, ${name || "usuário"}.</p>

            <p>
              Recebemos uma solicitação para redefinir a senha da sua conta na Fluxy.
              Clique no botão abaixo para criar uma nova senha.
            </p>

            <p style="text-align:center; margin:30px 0;">
              <a href="${resetLink}" style="background:linear-gradient(135deg,#3498db,#1abc9c); color:#ffffff; padding:14px 22px; border-radius:12px; text-decoration:none; font-weight:700;">
                Redefinir minha senha
              </a>
            </p>

            <p style="font-size:14px; color:#64748b;">
              Esse link expira em 1 hora. Se você não solicitou essa recuperação, ignore este e-mail.
            </p>

            <p style="font-size:13px; color:#64748b; word-break:break-all;">
              Caso o botão não funcione, copie e cole este link no navegador:<br>
              ${resetLink}
            </p>
          </div>
        </div>
      </div>
    `
  });
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
    }

    const userExists = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (userExists) {
      return res.status(400).json({ error: "Email já existe" });
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
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "Informe e-mail e senha." });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Senha inválida" });
    }

    const token = jwt.sign({ userId: user.id }, SECRET, {
      expiresIn: "7d"
    });

    const { password: _, resetToken, resetTokenExpires, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ESQUECI MINHA SENHA
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "Informe o e-mail cadastrado." });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // Por segurança, não revela se o e-mail existe ou não.
    if (!user) {
      return res.json({
        message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação."
      });
    }

    const rawToken = createResetToken();
    const hashedToken = hashResetToken(rawToken);

    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpires: expires
      }
    });

    const resetLink = `${FRONTEND_URL}/reset-password.html?token=${rawToken}&id=${user.id}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink
    });

    res.json({
      message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação."
    });
  } catch (error) {
    console.error("Erro forgot-password:", error);

    res.status(500).json({
      error: "Não foi possível enviar o e-mail de recuperação."
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
      where: { id: user.id },
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