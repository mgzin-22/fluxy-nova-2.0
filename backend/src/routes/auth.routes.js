const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const authMiddleware = require("../middlewares/auth.middleware");

const prisma = new PrismaClient();

router.use(authMiddleware);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}

function isInvalidNumber(value) {
  return Number.isNaN(value) || value === null;
}

async function uploadProductImage(imageBase64) {
  if (!imageBase64) return null;

  const uploadResult = await cloudinary.uploader.upload(imageBase64, {
    folder: "fluxy/products",
    resource_type: "image"
  });

  return uploadResult.secure_url;
}

async function createProductStockNotification(product, userId) {
  const stock = Number(product.stock || 0);
  const minStock = Number(product.minStock || 0);

  if (stock > 0 && (!minStock || stock > minStock)) return;

  const kind = stock <= 0 ? "STOCK_OUT" : "STOCK_LOW";
  const type = stock <= 0 ? "danger" : "warning";
  const icon = stock <= 0 ? "package-x" : "triangle-alert";
  const title = stock <= 0 ? "Produto sem estoque" : "Estoque baixo";

  const message =
    stock <= 0
      ? `${product.name} está sem estoque.`
      : `${product.name} está com ${stock} unidade(s). Estoque mínimo: ${minStock}.`;

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const exists = await prisma.notification.findFirst({
    where: {
      userId,
      kind,
      sourceId: product.id,
      sourceType: "Product",
      read: false,
      createdAt: {
        gte: last24h
      }
    }
  });

  if (exists) return;

  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      icon,
      kind,
      sourceId: product.id,
      sourceType: "Product"
    }
  });
}

// LISTAR PRODUTOS
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        userId: req.userId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao listar produtos.",
      details: error.message
    });
  }
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  try {
    const { name, category, price, stock, minStock, imageBase64 } = req.body;

    const productName = normalizeText(name);
    const productCategory = normalizeText(category);
    const productPrice = toNumber(price);
    const productStock = toNumber(stock);
    const productMinStock =
      minStock === "" || minStock === null || minStock === undefined
        ? null
        : toNumber(minStock);

    if (!productName || !productCategory || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Preencha nome, categoria, preço e estoque."
      });
    }

    if (isInvalidNumber(productPrice) || productPrice < 0) {
      return res.status(400).json({
        error: "Informe um preço válido."
      });
    }

    if (isInvalidNumber(productStock) || productStock < 0 || !Number.isInteger(productStock)) {
      return res.status(400).json({
        error: "Informe uma quantidade de estoque válida."
      });
    }

    if (
      productMinStock !== null &&
      (isInvalidNumber(productMinStock) || productMinStock < 0 || !Number.isInteger(productMinStock))
    ) {
      return res.status(400).json({
        error: "Informe um estoque mínimo válido."
      });
    }

    const imageUrl = await uploadProductImage(imageBase64);

    const product = await prisma.product.create({
      data: {
        name: productName,
        category: productCategory,
        price: productPrice,
        stock: productStock,
        minStock: productMinStock,
        imageUrl,
        userId: req.userId
      }
    });

    await createProductStockNotification(product, req.userId);

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao criar produto.",
      details: error.message
    });
  }
});

// EDITAR PRODUTO
router.put("/:id", async (req, res) => {
  try {
    const { name, category, price, stock, minStock, imageBase64 } = req.body;

    const productExists = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!productExists) {
      return res.status(404).json({
        error: "Produto não encontrado."
      });
    }

    const productName = normalizeText(name);
    const productCategory = normalizeText(category);
    const productPrice = toNumber(price);
    const productStock = toNumber(stock);
    const productMinStock =
      minStock === "" || minStock === null || minStock === undefined
        ? null
        : toNumber(minStock);

    if (!productName || !productCategory || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Preencha nome, categoria, preço e estoque."
      });
    }

    if (isInvalidNumber(productPrice) || productPrice < 0) {
      return res.status(400).json({
        error: "Informe um preço válido."
      });
    }

    if (isInvalidNumber(productStock) || productStock < 0 || !Number.isInteger(productStock)) {
      return res.status(400).json({
        error: "Informe uma quantidade de estoque válida."
      });
    }

    if (
      productMinStock !== null &&
      (isInvalidNumber(productMinStock) || productMinStock < 0 || !Number.isInteger(productMinStock))
    ) {
      return res.status(400).json({
        error: "Informe um estoque mínimo válido."
      });
    }

    let imageUrl = productExists.imageUrl;

    if (imageBase64) {
      imageUrl = await uploadProductImage(imageBase64);
    }

    const product = await prisma.product.update({
      where: {
        id: req.params.id
      },
      data: {
        name: productName,
        category: productCategory,
        price: productPrice,
        stock: productStock,
        minStock: productMinStock,
        imageUrl
      }
    });

    await createProductStockNotification(product, req.userId);

    res.json(product);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao editar produto.",
      details: error.message
    });
  }
});

// DELETAR PRODUTO COM REGRA DE INTEGRIDADE
router.delete("/:id", async (req, res) => {
  try {
    const productExists = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!productExists) {
      return res.status(404).json({
        error: "Produto não encontrado."
      });
    }

    const vendasVinculadas = await prisma.venda.count({
      where: {
        productId: req.params.id,
        userId: req.userId
      }
    });

    if (vendasVinculadas > 0) {
      return res.status(409).json({
        error: "Este produto não pode ser excluído porque já possui vendas vinculadas.",
        message:
          "Para manter o histórico e a integridade dos relatórios, produtos vendidos devem permanecer cadastrados.",
        vendasVinculadas
      });
    }

    await prisma.product.delete({
      where: {
        id: req.params.id
      }
    });

    res.json({
      message: "Produto removido com sucesso."
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao deletar produto.",
      details: error.message
    });
  }
});

module.exports = router;