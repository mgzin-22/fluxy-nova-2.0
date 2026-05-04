const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

// LISTAR PRODUTOS
router.get("/", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" }
  });

  res.json(products);
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  const { name, price, stock, minStock } = req.body;

  const product = await prisma.product.create({
    data: {
      name,
      price: Number(price),
      stock: Number(stock),
      minStock: minStock ? Number(minStock) : null,
      userId: req.userId
    }
  });

  res.json(product);
});

// DELETAR
router.delete("/:id", async (req, res) => {
  await prisma.product.delete({
    where: { id: req.params.id }
  });

  res.json({ message: "Produto removido" });
});

module.exports = router;