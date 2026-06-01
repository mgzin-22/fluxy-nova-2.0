const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

async function uploadBusinessLogo(imageBase64) {
  if (!imageBase64) return null;

  const uploadResult = await cloudinary.uploader.upload(imageBase64, {
    folder: "fluxy/business-logos",
    resource_type: "image"
  });

  return uploadResult.secure_url;
}

// BUSCAR PERFIL DO USUÁRIO LOGADO
router.get("/me", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        businessType: true,
        monthlyGoal: true,
        businessLogoUrl: true,
        phone: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado."
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao carregar perfil.",
      details: error.message
    });
  }
});

// ATUALIZAR PERFIL DO USUÁRIO LOGADO
router.put("/me", async (req, res) => {
  try {
    const {
      name,
      businessName,
      businessType,
      monthlyGoal,
      phone,
      businessLogoBase64,
      removeBusinessLogo
    } = req.body;

    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.userId
      }
    });

    if (!currentUser) {
      return res.status(404).json({
        error: "Usuário não encontrado."
      });
    }

    let businessLogoUrl = currentUser.businessLogoUrl;

    if (removeBusinessLogo) {
      businessLogoUrl = null;
    }

    if (businessLogoBase64) {
      businessLogoUrl = await uploadBusinessLogo(businessLogoBase64);
    }

    const user = await prisma.user.update({
      where: {
        id: req.userId
      },
      data: {
        name: name?.trim() || currentUser.name,
        businessName: businessName?.trim() || null,
        businessType: businessType?.trim() || null,
        monthlyGoal: monthlyGoal ? Number(monthlyGoal) : null,
        phone: phone?.trim() || null,
        businessLogoUrl
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        businessType: true,
        monthlyGoal: true,
        businessLogoUrl: true,
        phone: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao atualizar perfil.",
      details: error.message
    });
  }
});

// ALTERAR SENHA
router.put("/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Informe a senha atual e a nova senha."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "A nova senha deve ter no mínimo 6 caracteres."
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      }
    });

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado."
      });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(400).json({
        error: "Senha atual incorreta."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id: req.userId
      },
      data: {
        password: hashedPassword
      }
    });

    res.json({
      message: "Senha atualizada com sucesso."
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao atualizar senha.",
      details: error.message
    });
  }
});

module.exports = router;