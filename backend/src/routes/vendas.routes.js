const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

// CRIAR VENDA INTEGRADA AO ESTOQUE
router.post("/", async (req, res) => {
  try {
    const { productId, quantidade, pagamento } = req.body;

    if (!productId || !quantidade || !pagamento) {
      return res.status(400).json({
        error: "Informe o produto, a quantidade e a forma de pagamento."
      });
    }

    const qtd = Number(quantidade);

    if (qtd <= 0) {
      return res.status(400).json({
        error: "A quantidade precisa ser maior que zero."
      });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: req.userId
      }
    });

    if (!product) {
      return res.status(404).json({
        error: "Produto não encontrado."
      });
    }

    if (product.stock < qtd) {
      return res.status(400).json({
        error: `Estoque insuficiente. Disponível: ${product.stock}.`
      });
    }

    const valorTotal = product.price * qtd;

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          produto: product.name,
          categoria: product.category,
          quantidade: qtd,
          precoUnitario: product.price,
          valor: valorTotal,
          pagamento,
          status: "Concluída",
          userId: req.userId,
          productId: product.id
        }
      });

      await tx.product.update({
        where: {
          id: product.id
        },
        data: {
          stock: product.stock - qtd
        }
      });

      return novaVenda;
    });

    res.status(201).json(venda);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LISTAR VENDAS
router.get("/", async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: {
        userId: req.userId
      },
      include: {
        product: true
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

// RESUMO DAS VENDAS
router.get("/summary", async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      where: {
        userId: req.userId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const vendasHoje = vendas.filter((venda) => {
      const dataVenda = new Date(venda.createdAt);
      return dataVenda >= hoje;
    });

    const totalHoje = vendasHoje.reduce((total, venda) => total + venda.valor, 0);
    const totalPeriodo = vendas.reduce((total, venda) => total + venda.valor, 0);
    const itensVendidos = vendas.reduce((total, venda) => total + venda.quantidade, 0);

    const pagamentos = vendas.reduce((acc, venda) => {
      acc[venda.pagamento] = (acc[venda.pagamento] || 0) + venda.valor;
      return acc;
    }, {});

    const pagamentoDestaque = Object.entries(pagamentos).sort((a, b) => b[1] - a[1])[0];

    res.json({
      vendasHoje: vendasHoje.length,
      totalHoje,
      totalPeriodo,
      itensVendidos,
      pagamentoDestaque: pagamentoDestaque
        ? {
            nome: pagamentoDestaque[0],
            valor: pagamentoDestaque[1]
          }
        : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;