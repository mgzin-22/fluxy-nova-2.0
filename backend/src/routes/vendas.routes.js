const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

router.post("/", async (req, res) => {
  try {
    const { produto, valor, pagamento } = req.body;

    const venda = await prisma.venda.create({
      data: {
        produto,
        valor,
        pagamento,
        userId: req.userId
      }
    });

    res.json(venda);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: {
        userId: req.userId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(vendas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;