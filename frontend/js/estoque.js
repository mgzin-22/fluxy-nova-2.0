const API = "https://fluxy-api-r0lt.onrender.com/products";
const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const token = localStorage.getItem(TOKEN_KEY);

const lista = document.getElementById("lista-produtos");
const formProduto = document.getElementById("form-produto");
const themeBtn = document.getElementById("toggle-theme");
const feedback = document.getElementById("estoque-feedback");
const productsCount = document.getElementById("products-count");

const nomeInput = document.getElementById("nome");
const categoriaInput = document.getElementById("categoria");
const precoInput = document.getElementById("preco");
const estoqueInput = document.getElementById("estoque");
const minimoInput = document.getElementById("minimo");

const buscarProdutoInput = document.getElementById("buscar-produto");
const filtroCategoriaInput = document.getElementById("filtro-categoria");

let produtosGlobais = [];

if (!token) {
  window.location.href = "auth.html";
}

function aplicarTemaSalvo() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";

  document.body.classList.toggle("light", savedTheme === "light");

  if (themeBtn) {
    themeBtn.textContent = savedTheme === "light" ? "☀️" : "🌙";
  }
}

function alternarTema() {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");

  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");

  if (themeBtn) {
    themeBtn.textContent = isLight ? "☀️" : "🌙";
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function showFeedback(message, type = "success") {
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `feedback ${type}`;

  setTimeout(() => {
    feedback.textContent = "";
    feedback.className = "feedback";
  }, 2500);
}

function getProductInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "P";
}

function getStockStatus(product) {
  const stock = Number(product.stock);
  const minStock = product.minStock === null || product.minStock === undefined
    ? 0
    : Number(product.minStock);

  if (stock <= 0) {
    return {
      label: "Sem estoque",
      type: "danger"
    };
  }

  if (minStock > 0 && stock <= minStock) {
    return {
      label: "Estoque baixo",
      type: "warning"
    };
  }

  return {
    label: "Normal",
    type: "normal"
  };
}

function filtrarProdutos() {
  const termo = buscarProdutoInput.value.trim().toLowerCase();
  const categoria = filtroCategoriaInput.value;

  return produtosGlobais.filter((produto) => {
    const nome = produto.name.toLowerCase();
    const categoriaProduto = produto.category || "Outros";

    const bateNome = nome.includes(termo);
    const bateCategoria = categoria === "todas" || categoriaProduto === categoria;

    return bateNome && bateCategoria;
  });
}

function renderizarProdutos() {
  const produtos = filtrarProdutos();

  lista.innerHTML = "";

  if (productsCount) {
    const total = produtosGlobais.length;
    const exibidos = produtos.length;

    productsCount.textContent =
      total === 0
        ? "Nenhum produto cadastrado"
        : `Mostrando ${exibidos} de ${total} produtos`;
  }

  if (!produtos.length) {
    lista.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Nenhum produto encontrado.</td>
      </tr>
    `;
    return;
  }

  produtos.forEach((p) => {
    const status = getStockStatus(p);
    const categoria = p.category || "Outros";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="product-main">
          <div class="product-avatar">${getProductInitial(p.name)}</div>

          <div class="product-info">
            <strong>${p.name}</strong>
            <small>Cadastrado no estoque</small>
          </div>
        </div>
      </td>

      <td>
        <span class="category-badge">${categoria}</span>
      </td>

      <td>${formatMoney(p.price)}</td>

      <td>
        <span class="stock-number ${status.type}">${p.stock}</span>
      </td>

      <td>${p.minStock ?? "-"}</td>

      <td>
        <span class="status-badge ${status.type}">${status.label}</span>
      </td>
    `;

    lista.appendChild(row);
  });
}

async function carregarProdutos() {
  try {
    const res = await fetch(API, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      sair();
      return;
    }

    produtosGlobais = await res.json();
    renderizarProdutos();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao carregar produtos.", "error");
  }
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {
    name: nomeInput.value.trim(),
    category: categoriaInput.value,
    price: precoInput.value,
    stock: estoqueInput.value,
    minStock: minimoInput.value
  };

  if (!body.name || !body.category || !body.price || body.stock === "") {
    showFeedback("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  try {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      showFeedback(result.error || "Erro ao salvar produto.", "error");
      return;
    }

    formProduto.reset();
    showFeedback("Produto salvo com sucesso!");
    await carregarProdutos();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com servidor.", "error");
  }
});

buscarProdutoInput.addEventListener("input", renderizarProdutos);
filtroCategoriaInput.addEventListener("change", renderizarProdutos);

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

aplicarTemaSalvo();
carregarProdutos();

if (themeBtn) {
  themeBtn.addEventListener("click", alternarTema);
}

if (window.lucide) {
  lucide.createIcons();
}