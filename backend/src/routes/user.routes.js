const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

router.get("/me", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        businessType: true,
        monthlyGoal: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/me", async (req, res) => {
  try {
    const { name, businessName, businessType, monthlyGoal } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name,
        businessName,
        businessType,
        monthlyGoal: monthlyGoal ? Number(monthlyGoal) : null
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        businessType: true,
        monthlyGoal: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: "Senha atual incorreta." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword }
    });

    res.json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;