const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

function getWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);

  const weekStart = new Date(current.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function createNotificationIfMissing({
  userId,
  title,
  message,
  type = "info",
  icon = "bell",
  kind,
  sourceId = null,
  sourceType = null,
  since = null
}) {
  const where = {
    userId,
    kind,
    sourceId,
    sourceType,
    read: false
  };

  if (since) {
    where.createdAt = {
      gte: since
    };
  }

  const exists = await prisma.notification.findFirst({
    where
  });

  if (exists) return exists;

  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      icon,
      kind,
      sourceId,
      sourceType
    }
  });
}

async function syncStockNotifications(userId) {
  const produtos = await prisma.product.findMany({
    where: {
      userId
    }
  });

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const produto of produtos) {
    const stock = Number(produto.stock || 0);
    const minStock = Number(produto.minStock || 0);

    if (stock <= 0) {
      await createNotificationIfMissing({
        userId,
        title: "Produto sem estoque",
        message: `${produto.name} chegou a 0 unidades. Reponha para continuar vendendo.`,
        type: "danger",
        icon: "package-x",
        kind: "STOCK_OUT",
        sourceId: produto.id,
        sourceType: "Product",
        since: last24h
      });

      continue;
    }

    if (minStock > 0 && stock <= minStock) {
      await createNotificationIfMissing({
        userId,
        title: "Estoque baixo",
        message: `${produto.name} está com ${stock} unidade(s). Estoque mínimo: ${minStock}.`,
        type: "warning",
        icon: "triangle-alert",
        kind: "STOCK_LOW",
        sourceId: produto.id,
        sourceType: "Product",
        since: last24h
      });
    }
  }
}

async function syncWeeklySummary(userId) {
  const weekStart = getWeekStart();
  const now = new Date();

  const exists = await prisma.notification.findFirst({
    where: {
      userId,
      kind: "WEEKLY_SUMMARY",
      createdAt: {
        gte: weekStart
      }
    }
  });

  if (exists) return exists;

  const vendas = await prisma.venda.findMany({
    where: {
      userId,
      createdAt: {
        gte: weekStart,
        lte: now
      }
    }
  });

  if (!vendas.length) return null;

  const total = vendas.reduce((sum, venda) => {
    return sum + Number(venda.valor || 0);
  }, 0);

  const produtos = {};
  const pagamentos = {};

  vendas.forEach((venda) => {
    produtos[venda.produto] = (produtos[venda.produto] || 0) + Number(venda.quantidade || 1);
    pagamentos[venda.pagamento] = (pagamentos[venda.pagamento] || 0) + Number(venda.valor || 0);
  });

  const produtoTop = Object.entries(produtos).sort((a, b) => b[1] - a[1])[0];
  const pagamentoTop = Object.entries(pagamentos).sort((a, b) => b[1] - a[1])[0];

  return prisma.notification.create({
    data: {
      userId,
      title: "Resumo semanal da Fluxy",
      message: `Nesta semana você registrou ${vendas.length} venda(s), somando ${formatMoney(total)}. Produto destaque: ${produtoTop?.[0] || "-"}. Pagamento destaque: ${pagamentoTop?.[0] || "-"}.`,
      type: "success",
      icon: "calendar-check",
      kind: "WEEKLY_SUMMARY",
      sourceType: "System"
    }
  });
}

// LISTAR NOTIFICAÇÕES
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 30), 100);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId,
        read: false
      }
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao listar notificações.",
      details: error.message
    });
  }
});

// SINCRONIZAR ALERTAS DO SISTEMA/APP
router.post("/sync", async (req, res) => {
  try {
    await syncStockNotifications(req.userId);
    await syncWeeklySummary(req.userId);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 30
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId,
        read: false
      }
    });

    res.json({
      message: "Notificações sincronizadas.",
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao sincronizar notificações.",
      details: error.message
    });
  }
});

// MARCAR UMA COMO LIDA
router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: "Notificação não encontrada."
      });
    }

    const updated = await prisma.notification.update({
      where: {
        id: notification.id
      },
      data: {
        read: true
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao marcar notificação como lida.",
      details: error.message
    });
  }
});

// MARCAR TODAS COMO LIDAS
router.patch("/read-all", async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        read: false
      },
      data: {
        read: true
      }
    });

    res.json({
      message: "Todas as notificações foram marcadas como lidas."
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao marcar todas como lidas.",
      details: error.message
    });
  }
});

// DELETAR NOTIFICAÇÃO
router.delete("/:id", async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: "Notificação não encontrada."
      });
    }

    await prisma.notification.delete({
      where: {
        id: notification.id
      }
    });

    res.json({
      message: "Notificação removida."
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao remover notificação.",
      details: error.message
    });
  }
});

module.exports = router;