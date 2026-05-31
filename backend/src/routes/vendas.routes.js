const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePayment(value) {
  const payment = normalizeText(value).toLowerCase();

  const allowedPayments = ["pix", "dinheiro", "cartao"];

  if (!allowedPayments.includes(payment)) {
    return null;
  }

  return payment;
}

// CRIAR VENDA INTEGRADA AO ESTOQUE
router.post("/", async (req, res) => {
  try {
    const { productId, quantidade, pagamento } = req.body;

    const saleProductId = normalizeText(productId);
    const qtd = Number(quantidade);
    const payment = normalizePayment(pagamento);

    if (!saleProductId || quantidade === undefined || !pagamento) {
      return res.status(400).json({
        error: "Informe o produto, a quantidade e a forma de pagamento."
      });
    }

    if (!Number.isInteger(qtd) || qtd <= 0) {
      return res.status(400).json({
        error: "A quantidade precisa ser um número inteiro maior que zero."
      });
    }

    if (!payment) {
      return res.status(400).json({
        error: "Forma de pagamento inválida. Use pix, dinheiro ou cartao."
      });
    }

    const venda = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: saleProductId,
          userId: req.userId
        }
      });

      if (!product) {
        const error = new Error("Produto não encontrado.");
        error.statusCode = 404;
        throw error;
      }

      if (product.stock < qtd) {
        const error = new Error(`Estoque insuficiente. Disponível: ${product.stock}.`);
        error.statusCode = 400;
        throw error;
      }

      const updatedProduct = await tx.product.update({
        where: {
          id: product.id
        },
        data: {
          stock: {
            decrement: qtd
          }
        }
      });

      if (updatedProduct.stock < 0) {
        const error = new Error("Estoque insuficiente para concluir a venda.");
        error.statusCode = 400;
        throw error;
      }

      const valorTotal = Number(product.price) * qtd;

      const novaVenda = await tx.venda.create({
        data: {
          produto: product.name,
          categoria: product.category,
          quantidade: qtd,
          precoUnitario: product.price,
          valor: valorTotal,
          pagamento: payment,
          status: "Concluída",
          userId: req.userId,
          productId: product.id
        },
        include: {
          product: true
        }
      });

      return novaVenda;
    });

    res.status(201).json(venda);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      error: error.message || "Erro ao registrar venda."
    });
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
    res.status(500).json({
      error: "Erro ao listar vendas.",
      details: error.message
    });
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

    const totalHoje = vendasHoje.reduce((total, venda) => {
      return total + Number(venda.valor || 0);
    }, 0);

    const totalPeriodo = vendas.reduce((total, venda) => {
      return total + Number(venda.valor || 0);
    }, 0);

    const itensVendidos = vendas.reduce((total, venda) => {
      return total + Number(venda.quantidade || 1);
    }, 0);

    const pagamentos = vendas.reduce((acc, venda) => {
      acc[venda.pagamento] = (acc[venda.pagamento] || 0) + Number(venda.valor || 0);
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
    res.status(500).json({
      error: "Erro ao gerar resumo das vendas.",
      details: error.message
    });
  }
});

module.exports = router;