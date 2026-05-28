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

const editModal = document.getElementById("edit-modal");
const deleteModal = document.getElementById("delete-modal");

const closeEditModalBtn = document.getElementById("close-edit-modal");
const formEditarProduto = document.getElementById("form-editar-produto");

const editIdInput = document.getElementById("edit-id");
const editNomeInput = document.getElementById("edit-nome");
const editCategoriaInput = document.getElementById("edit-categoria");
const editPrecoInput = document.getElementById("edit-preco");
const editEstoqueInput = document.getElementById("edit-estoque");
const editMinimoInput = document.getElementById("edit-minimo");

const cancelDeleteBtn = document.getElementById("cancel-delete");
const confirmDeleteBtn = document.getElementById("confirm-delete");
const deleteProductText = document.getElementById("delete-product-text");

let produtosGlobais = [];
let produtoParaDeletar = null;

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
        <td colspan="7">Nenhum produto encontrado.</td>
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

      <td>
        <div class="actions">
          <button class="icon-btn edit" type="button" title="Editar produto" onclick="abrirModalEditar('${p.id}')">
            <i data-lucide="pencil"></i>
          </button>

          <button class="icon-btn delete" type="button" title="Excluir produto" onclick="abrirModalDeletar('${p.id}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;

    lista.appendChild(row);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
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

function abrirModalEditar(id) {
  const produto = produtosGlobais.find((item) => item.id === id);

  if (!produto) return;

  editIdInput.value = produto.id;
  editNomeInput.value = produto.name;
  editCategoriaInput.value = produto.category || "Outros";
  editPrecoInput.value = produto.price;
  editEstoqueInput.value = produto.stock;
  editMinimoInput.value = produto.minStock ?? "";

  editModal.hidden = false;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function fecharModalEditar() {
  editModal.hidden = true;
  formEditarProduto.reset();
}

formEditarProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = editIdInput.value;

  const body = {
    name: editNomeInput.value.trim(),
    category: editCategoriaInput.value,
    price: editPrecoInput.value,
    stock: editEstoqueInput.value,
    minStock: editMinimoInput.value
  };

  try {
    const response = await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      showFeedback(result.error || "Erro ao editar produto.", "error");
      return;
    }

    fecharModalEditar();
    showFeedback("Produto atualizado com sucesso!");
    await carregarProdutos();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com servidor.", "error");
  }
});

function abrirModalDeletar(id) {
  const produto = produtosGlobais.find((item) => item.id === id);

  if (!produto) return;

  produtoParaDeletar = produto;

  deleteProductText.textContent = `Tem certeza que deseja excluir "${produto.name}"?`;
  deleteModal.hidden = false;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function fecharModalDeletar() {
  deleteModal.hidden = true;
  produtoParaDeletar = null;
}

confirmDeleteBtn.addEventListener("click", async () => {
  if (!produtoParaDeletar) return;

  try {
    const response = await fetch(`${API}/${produtoParaDeletar.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      showFeedback(result.error || "Erro ao excluir produto.", "error");
      return;
    }

    fecharModalDeletar();
    showFeedback("Produto excluído com sucesso!");
    await carregarProdutos();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com servidor.", "error");
  }
});

buscarProdutoInput.addEventListener("input", renderizarProdutos);
filtroCategoriaInput.addEventListener("change", renderizarProdutos);

closeEditModalBtn.addEventListener("click", fecharModalEditar);
cancelDeleteBtn.addEventListener("click", fecharModalDeletar);

editModal.addEventListener("click", (event) => {
  if (event.target === editModal) {
    fecharModalEditar();
  }
});

deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) {
    fecharModalDeletar();
  }
});

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