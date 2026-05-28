const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

// LISTAR PRODUTOS
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  try {
    const { name, category, price, stock, minStock } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        category,
        price: Number(price),
        stock: Number(stock),
        minStock: minStock ? Number(minStock) : null,
        userId: req.userId
      }
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETAR PRODUTO
router.delete("/:id", async (req, res) => {
  try {
    await prisma.product.delete({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    res.json({ message: "Produto removido" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;