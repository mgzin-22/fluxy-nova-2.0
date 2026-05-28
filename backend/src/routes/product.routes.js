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

    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Preencha nome, categoria, preço e estoque."
      });
    }

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

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EDITAR PRODUTO
router.put("/:id", async (req, res) => {
  try {
    const { name, category, price, stock, minStock } = req.body;

    const productExists = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!productExists) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const product = await prisma.product.update({
      where: {
        id: req.params.id
      },
      data: {
        name,
        category,
        price: Number(price),
        stock: Number(stock),
        minStock: minStock ? Number(minStock) : null
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
    const productExists = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!productExists) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    await prisma.product.delete({
      where: {
        id: req.params.id
      }
    });

    res.json({ message: "Produto removido com sucesso." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;