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
const imagemProdutoInput = document.getElementById("imagem-produto");
const imagePreview = document.getElementById("image-preview");
const imageLabel = document.getElementById("image-label");

const buscarProdutoInput = document.getElementById("buscar-produto");
const filtroCategoriaInput = document.getElementById("filtro-categoria");
const categoriasList = document.getElementById("categorias-list");

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
const editImagemProdutoInput = document.getElementById("edit-imagem-produto");
const editImagePreview = document.getElementById("edit-image-preview");

const cancelDeleteBtn = document.getElementById("cancel-delete");
const confirmDeleteBtn = document.getElementById("confirm-delete");
const deleteProductText = document.getElementById("delete-product-text");

let produtosGlobais = [];
let produtoParaDeletar = null;
let imagemBase64 = null;
let editImagemBase64 = null;

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

function notifyToast(type, icon, title, message) {
  if (typeof showToast === "function") {
    showToast({
      type,
      icon,
      title,
      message
    });
  }
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Erro ao ler imagem."));

    reader.readAsDataURL(file);
  });
}

function renderPreview(container, imageUrl) {
  if (!container) return;

  if (imageUrl) {
    container.innerHTML = `<img src="${imageUrl}" alt="Preview do produto">`;
  } else {
    container.innerHTML = `<i data-lucide="image-plus"></i>`;
  }

  if (window.lucide) {
    lucide.createIcons();
  }
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

function obterCategoriasUnicas() {
  return [...new Set(
    produtosGlobais
      .map((produto) => produto.category)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function atualizarCategorias() {
  const categorias = obterCategoriasUnicas();
  const categoriaSelecionada = filtroCategoriaInput.value;

  filtroCategoriaInput.innerHTML = `<option value="todas">Todas as categorias</option>`;
  categoriasList.innerHTML = "";

  categorias.forEach((categoria) => {
    const optionFiltro = document.createElement("option");
    optionFiltro.value = categoria;
    optionFiltro.textContent = categoria;
    filtroCategoriaInput.appendChild(optionFiltro);

    const optionDatalist = document.createElement("option");
    optionDatalist.value = categoria;
    categoriasList.appendChild(optionDatalist);
  });

  if ([...filtroCategoriaInput.options].some((option) => option.value === categoriaSelecionada)) {
    filtroCategoriaInput.value = categoriaSelecionada;
  }
}

function filtrarProdutos() {
  const termo = buscarProdutoInput.value.trim().toLowerCase();
  const categoria = filtroCategoriaInput.value;

  return produtosGlobais.filter((produto) => {
    const nome = produto.name.toLowerCase();
    const categoriaProduto = produto.category || "Sem categoria";

    const bateNome = nome.includes(termo);
    const bateCategoria = categoria === "todas" || categoriaProduto === categoria;

    return bateNome && bateCategoria;
  });
}

function renderizarProdutos() {
  atualizarCategorias();

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
    const categoria = p.category || "Sem categoria";

    const row = document.createElement("tr");

    const avatarContent = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}">`
      : getProductInitial(p.name);

    row.innerHTML = `
      <td>
        <div class="product-main">
          <div class="product-avatar">${avatarContent}</div>

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

    const data = await res.json();

    if (!res.ok) {
      produtosGlobais = [];
      renderizarProdutos();

      showFeedback(data.error || "Erro ao carregar produtos.", "error");
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao carregar estoque",
        data.error || "Não foi possível buscar os produtos."
      );
      return;
    }

    produtosGlobais = Array.isArray(data) ? data : [];
    renderizarProdutos();
  } catch (error) {
    console.error(error);

    produtosGlobais = [];
    renderizarProdutos();

    showFeedback("Erro ao carregar produtos.", "error");
    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com o servidor."
    );
  }
}

imagemProdutoInput.addEventListener("change", async () => {
  const file = imagemProdutoInput.files[0];

  if (!file) {
    imagemBase64 = null;
    renderPreview(imagePreview, null);
    imageLabel.textContent = "Selecionar imagem";
    return;
  }

  imagemBase64 = await fileToBase64(file);
  renderPreview(imagePreview, imagemBase64);
  imageLabel.textContent = "Imagem selecionada";

  notifyToast(
    "info",
    "image",
    "Imagem selecionada",
    "A imagem será enviada ao salvar o produto."
  );
});

editImagemProdutoInput.addEventListener("change", async () => {
  const file = editImagemProdutoInput.files[0];

  if (!file) {
    editImagemBase64 = null;
    return;
  }

  editImagemBase64 = await fileToBase64(file);
  renderPreview(editImagePreview, editImagemBase64);

  notifyToast(
    "info",
    "image",
    "Nova imagem selecionada",
    "A imagem será atualizada ao salvar as alterações."
  );
});

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {
    name: nomeInput.value.trim(),
    category: categoriaInput.value.trim(),
    price: precoInput.value,
    stock: estoqueInput.value,
    minStock: minimoInput.value,
    imageBase64: imagemBase64
  };

  if (!body.name || !body.category || !body.price || body.stock === "") {
    showFeedback("Preencha nome, categoria, preço e estoque.", "error");
    notifyToast(
      "warning",
      "triangle-alert",
      "Campos obrigatórios",
      "Preencha nome, categoria, preço e estoque."
    );
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
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao salvar produto",
        result.error || "Não foi possível cadastrar o produto."
      );
      return;
    }

    formProduto.reset();
    imagemBase64 = null;
    renderPreview(imagePreview, null);
    imageLabel.textContent = "Selecionar imagem";

    showFeedback("Produto salvo com sucesso!");
    notifyToast(
      "success",
      "check",
      "Produto salvo",
      "O produto foi cadastrado no estoque."
    );

    await carregarProdutos();
  } catch (error) {
    console.error(error);

    showFeedback("Erro ao conectar com servidor.", "error");
    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com o servidor."
    );
  }
});

function abrirModalEditar(id) {
  const produto = produtosGlobais.find((item) => item.id === id);

  if (!produto) return;

  editImagemBase64 = null;

  editIdInput.value = produto.id;
  editNomeInput.value = produto.name;
  editCategoriaInput.value = produto.category || "";
  editPrecoInput.value = produto.price;
  editEstoqueInput.value = produto.stock;
  editMinimoInput.value = produto.minStock ?? "";
  editImagemProdutoInput.value = "";

  renderPreview(editImagePreview, produto.imageUrl || null);

  editModal.hidden = false;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function fecharModalEditar() {
  editModal.hidden = true;
  formEditarProduto.reset();
  editImagemBase64 = null;
}

formEditarProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = editIdInput.value;

  const body = {
    name: editNomeInput.value.trim(),
    category: editCategoriaInput.value.trim(),
    price: editPrecoInput.value,
    stock: editEstoqueInput.value,
    minStock: editMinimoInput.value,
    imageBase64: editImagemBase64
  };

  if (!body.name || !body.category || !body.price || body.stock === "") {
    showFeedback("Preencha nome, categoria, preço e estoque.", "error");
    notifyToast(
      "warning",
      "triangle-alert",
      "Campos obrigatórios",
      "Preencha nome, categoria, preço e estoque."
    );
    return;
  }

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
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao editar produto",
        result.error || "Não foi possível atualizar o produto."
      );
      return;
    }

    fecharModalEditar();

    showFeedback("Produto atualizado com sucesso!");
    notifyToast(
      "success",
      "pencil",
      "Produto atualizado",
      "As informações do produto foram alteradas."
    );

    await carregarProdutos();
  } catch (error) {
    console.error(error);

    showFeedback("Erro ao conectar com servidor.", "error");
    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com o servidor."
    );
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
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao excluir produto",
        result.error || "Não foi possível excluir o produto."
      );
      return;
    }

    fecharModalDeletar();

    showFeedback("Produto excluído com sucesso!");
    notifyToast(
      "danger",
      "trash-2",
      "Produto excluído",
      "O produto foi removido do estoque."
    );

    await carregarProdutos();
  } catch (error) {
    console.error(error);

    showFeedback("Erro ao conectar com servidor.", "error");
    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com o servidor."
    );
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