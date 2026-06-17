const API_BASE = "https://fluxy-api-r0lt.onrender.com";
const PRODUCTS_API = `${API_BASE}/products`;
const VENDAS_API = `${API_BASE}/vendas`;

const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const token = localStorage.getItem(TOKEN_KEY);

const formVenda = document.getElementById("form-venda");

const produtoVendaInput = document.getElementById("produto-venda");
const buscarProdutoVendaInput = document.getElementById("buscar-produto-venda");
const productDropdown = document.getElementById("product-dropdown");
const limparProdutoVendaBtn = document.getElementById("limpar-produto-venda");

const categoriaVendaInput = document.getElementById("categoria-venda");
const quantidadeVendaInput = document.getElementById("quantidade-venda");
const precoUnitarioInput = document.getElementById("preco-unitario");
const pagamentoVendaInput = document.getElementById("pagamento-venda");
const vendasFeedback = document.getElementById("vendas-feedback");

const qtyMinusBtn = document.getElementById("qty-minus");
const qtyPlusBtn = document.getElementById("qty-plus");

const listaVendas = document.getElementById("lista-vendas");
const buscarVendaInput = document.getElementById("buscar-venda");
const filtroCategoriaInput = document.getElementById("filtro-categoria");
const filtroPagamentoInput = document.getElementById("filtro-pagamento");
const ordenarVendasInput = document.getElementById("ordenar-vendas");

const periodButtons = document.querySelectorAll(".period-btn");
const customDateBox = document.getElementById("custom-date-box");
const dataInicialInput = document.getElementById("data-inicial");
const dataFinalInput = document.getElementById("data-final");
const aplicarDataBtn = document.getElementById("aplicar-data");

const vendasHojeEl = document.getElementById("vendas-hoje");
const qtdVendasHojeEl = document.getElementById("qtd-vendas-hoje");
const totalPeriodoEl = document.getElementById("total-periodo");
const totalPeriodoLabelEl = document.getElementById("total-periodo-label");
const itensVendidosEl = document.getElementById("itens-vendidos");
const pagamentoDestaqueEl = document.getElementById("pagamento-destaque");
const pagamentoDestaqueValorEl = document.getElementById("pagamento-destaque-valor");
const salesCountEl = document.getElementById("sales-count");

const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfoEl = document.getElementById("page-info");

let produtosGlobais = [];
let vendasGlobais = [];
let periodoAtual = "today";
let dataInicialCustom = null;
let dataFinalCustom = null;

let paginaAtual = 1;
const itensPorPagina = 8;

if (!token) {
  window.location.href = "auth.html";
}

function aplicarTemaSalvo() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  document.body.classList.toggle("light", savedTheme === "light");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(date) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizePayment(value) {
  const labels = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    cartao: "Cartão"
  };

  return labels[value] || value || "-";
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
  vendasFeedback.textContent = message;
  vendasFeedback.className = `feedback ${type}`;

  setTimeout(() => {
    vendasFeedback.textContent = "";
    vendasFeedback.className = "feedback";
  }, 3000);
}

function getInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "P";
}

function getStockStatus(produto) {
  const stock = Number(produto.stock || 0);
  const minStock = Number(produto.minStock || 0);

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
    label: `${stock} un.`,
    type: "normal"
  };
}

function getProdutoSelecionado() {
  return produtosGlobais.find((produto) => produto.id === produtoVendaInput.value);
}

function getProductAvatar(produto) {
  if (produto.imageUrl) {
    return `
      <span class="product-option-avatar">
        <img src="${produto.imageUrl}" alt="${produto.name}">
      </span>
    `;
  }

  return `<span class="product-option-avatar">${getInitial(produto.name)}</span>`;
}

function limparProdutoSelecionado() {
  produtoVendaInput.value = "";
  buscarProdutoVendaInput.value = "";
  categoriaVendaInput.value = "";
  precoUnitarioInput.value = "";
  quantidadeVendaInput.value = 1;
  quantidadeVendaInput.removeAttribute("max");

  limparProdutoVendaBtn.hidden = true;
  productDropdown.hidden = true;
  productDropdown.innerHTML = "";
}

function selecionarProduto(produto) {
  if (Number(produto.stock) <= 0) {
    notifyToast(
      "warning",
      "package-x",
      "Produto sem estoque",
      "Este produto não pode ser vendido porque está sem estoque."
    );
    return;
  }

  produtoVendaInput.value = produto.id;
  buscarProdutoVendaInput.value = produto.name;
  categoriaVendaInput.value = produto.category || "Sem categoria";
  precoUnitarioInput.value = formatMoney(produto.price);
  quantidadeVendaInput.value = 1;
  quantidadeVendaInput.max = produto.stock;

  limparProdutoVendaBtn.hidden = false;
  productDropdown.hidden = true;
  productDropdown.innerHTML = "";
}

function filtrarProdutosParaVenda(search = "") {
  const termo = search.trim().toLowerCase();

  let produtos = [...produtosGlobais];

  if (termo) {
    produtos = produtos.filter((produto) => {
      const nome = produto.name?.toLowerCase() || "";
      const categoria = produto.category?.toLowerCase() || "";
      const sku = produto.id?.toLowerCase() || "";

      return nome.includes(termo) || categoria.includes(termo) || sku.includes(termo);
    });
  }

  return produtos
    .sort((a, b) => {
      const estoqueA = Number(a.stock || 0);
      const estoqueB = Number(b.stock || 0);

      if (estoqueA <= 0 && estoqueB > 0) return 1;
      if (estoqueA > 0 && estoqueB <= 0) return -1;

      return a.name.localeCompare(b.name, "pt-BR");
    })
    .slice(0, 10);
}

function renderProductDropdown(search = "") {
  const produtos = filtrarProdutosParaVenda(search);

  productDropdown.innerHTML = "";

  if (!produtos.length) {
    productDropdown.innerHTML = `
      <div class="product-empty-option">
        Nenhum produto encontrado.
        <br>
        <a href="estoque.html">Cadastrar novo produto</a>
      </div>
    `;

    productDropdown.hidden = false;
    return;
  }

  produtos.forEach((produto) => {
    const status = getStockStatus(produto);
    const disabled = Number(produto.stock) <= 0;

    const option = document.createElement("button");
    option.type = "button";
    option.className = `product-option ${disabled ? "disabled" : ""}`;

    option.innerHTML = `
      ${getProductAvatar(produto)}

      <span class="product-option-info">
        <strong>${produto.name}</strong>
        <small>
          ${produto.category || "Sem categoria"} • SKU: ${produto.id.slice(0, 8).toUpperCase()}
        </small>
      </span>

      <span class="product-option-meta">
        <span class="product-option-price">${formatMoney(produto.price)}</span>
        <span class="product-stock-pill ${status.type}">${status.label}</span>
      </span>
    `;

    option.addEventListener("click", () => selecionarProduto(produto));

    productDropdown.appendChild(option);
  });

  productDropdown.hidden = false;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function obterCategoriasDasVendas() {
  return [...new Set(
    vendasGlobais
      .map((venda) => venda.categoria || venda.product?.category)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function atualizarFiltroCategorias() {
  const categoriaSelecionada = filtroCategoriaInput.value;
  const categorias = obterCategoriasDasVendas();

  filtroCategoriaInput.innerHTML = `<option value="todas">Todas as categorias</option>`;

  categorias.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    filtroCategoriaInput.appendChild(option);
  });

  if ([...filtroCategoriaInput.options].some((option) => option.value === categoriaSelecionada)) {
    filtroCategoriaInput.value = categoriaSelecionada;
  }
}

async function carregarProdutos() {
  try {
    const response = await fetch(PRODUCTS_API, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      sair();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro produtos:", data);
      showFeedback(data.error || "Erro ao carregar produtos.", "error");
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao carregar produtos",
        data.error || "Não foi possível buscar os produtos do estoque."
      );
      return;
    }

    produtosGlobais = Array.isArray(data) ? data : [];

    const produtoSelecionado = getProdutoSelecionado();

    if (produtoSelecionado) {
      const produtoAtualizado = produtosGlobais.find((produto) => produto.id === produtoSelecionado.id);

      if (produtoAtualizado) {
        selecionarProduto(produtoAtualizado);
      } else {
        limparProdutoSelecionado();
      }
    }
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com produtos.", "error");
    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com o estoque."
    );
  }
}

async function carregarVendas() {
  try {
    const response = await fetch(VENDAS_API, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      sair();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro vendas:", data);
      showFeedback(data.error || "Erro ao carregar vendas.", "error");
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao carregar vendas",
        data.error || "Não foi possível buscar o histórico de vendas."
      );
      return;
    }

    vendasGlobais = Array.isArray(data) ? data : [];

    atualizarFiltroCategorias();
    resetarPagina();
    renderizarVendas();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com vendas.", "error");
    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com vendas."
    );
  }
}

function filtrarPorPeriodo(vendas) {
  const agora = new Date();

  return vendas.filter((venda) => {
    const dataVenda = new Date(venda.createdAt);

    if (periodoAtual === "today") {
      return dataVenda.toDateString() === agora.toDateString();
    }

    if (periodoAtual === "week") {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(agora.getDate() - 7);
      seteDiasAtras.setHours(0, 0, 0, 0);
      return dataVenda >= seteDiasAtras;
    }

    if (periodoAtual === "month") {
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(agora.getDate() - 30);
      trintaDiasAtras.setHours(0, 0, 0, 0);
      return dataVenda >= trintaDiasAtras;
    }

    if (periodoAtual === "custom") {
      if (!dataInicialCustom || !dataFinalCustom) return true;

      const inicio = new Date(`${dataInicialCustom}T00:00:00`);
      const fim = new Date(`${dataFinalCustom}T23:59:59`);

      return dataVenda >= inicio && dataVenda <= fim;
    }

    return true;
  });
}

function filtrarVendas() {
  const termo = buscarVendaInput.value.trim().toLowerCase();
  const categoria = filtroCategoriaInput.value;
  const pagamento = filtroPagamentoInput.value;

  return filtrarPorPeriodo(vendasGlobais).filter((venda) => {
    const produto = venda.produto?.toLowerCase() || "";
    const categoriaVenda = venda.categoria || venda.product?.category || "Sem categoria";
    const categoriaTexto = categoriaVenda.toLowerCase();

    const bateTexto = produto.includes(termo) || categoriaTexto.includes(termo);
    const bateCategoria = categoria === "todas" || categoriaVenda === categoria;
    const batePagamento = pagamento === "todos" || venda.pagamento === pagamento;

    return bateTexto && bateCategoria && batePagamento;
  });
}

function ordenarVendas(vendas) {
  const ordenacao = ordenarVendasInput.value;
  const vendasOrdenadas = [...vendas];

  if (ordenacao === "recentes") {
    return vendasOrdenadas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  if (ordenacao === "antigas") {
    return vendasOrdenadas.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  if (ordenacao === "maior-valor") {
    return vendasOrdenadas.sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));
  }

  if (ordenacao === "menor-valor") {
    return vendasOrdenadas.sort((a, b) => Number(a.valor || 0) - Number(b.valor || 0));
  }

  if (ordenacao === "maior-quantidade") {
    return vendasOrdenadas.sort((a, b) => Number(b.quantidade || 1) - Number(a.quantidade || 1));
  }

  return vendasOrdenadas;
}

function obterVendasTratadas() {
  return ordenarVendas(filtrarVendas());
}

function obterVendasDaPagina(vendas) {
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;

  return vendas.slice(inicio, fim);
}

function resetarPagina() {
  paginaAtual = 1;
}

function atualizarPaginacao(totalItens) {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas;
  }

  pageInfoEl.textContent = `Página ${paginaAtual} de ${totalPaginas}`;

  prevPageBtn.disabled = paginaAtual <= 1;
  nextPageBtn.disabled = paginaAtual >= totalPaginas;
}

function renderizarVendas() {
  const vendasFiltradas = obterVendasTratadas();
  const vendasPagina = obterVendasDaPagina(vendasFiltradas);

  listaVendas.innerHTML = "";

  if (salesCountEl) {
    salesCountEl.textContent =
      vendasFiltradas.length === 0
        ? "Nenhuma venda encontrada"
        : `Mostrando ${vendasPagina.length} de ${vendasFiltradas.length} venda(s)`;
  }

  atualizarResumo(vendasFiltradas);
  atualizarPaginacao(vendasFiltradas.length);

  if (!vendasPagina.length) {
    listaVendas.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Nenhuma venda encontrada.</td>
      </tr>
    `;
    return;
  }

  vendasPagina.forEach((venda) => {
    const row = document.createElement("tr");
    const produto = venda.product;

    const avatarContent = produto?.imageUrl
      ? `<img src="${produto.imageUrl}" alt="${venda.produto}">`
      : getInitial(venda.produto);

    row.innerHTML = `
      <td>
        <div class="sale-product">
          <div class="sale-avatar">${avatarContent}</div>

          <div class="sale-info">
            <strong>${venda.produto}</strong>
            <small>SKU: ${venda.productId ? venda.productId.slice(0, 8).toUpperCase() : "VENDA"}</small>
          </div>
        </div>
      </td>

      <td>
        <span class="badge category-badge">${venda.categoria || "Sem categoria"}</span>
      </td>

      <td>${venda.quantidade || 1}</td>

      <td>
        <span class="badge payment-badge ${venda.pagamento}">
          ${normalizePayment(venda.pagamento)}
        </span>
      </td>

      <td>${formatMoney(venda.valor)}</td>

      <td>${formatDate(venda.createdAt)}</td>

      <td>
        <span class="badge status-badge">${venda.status || "Concluída"}</span>
      </td>
    `;

    listaVendas.appendChild(row);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function atualizarResumo(vendas) {
  const totalPeriodo = vendas.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
  const itensVendidos = vendas.reduce((sum, venda) => sum + Number(venda.quantidade || 1), 0);

  const pagamentos = vendas.reduce((acc, venda) => {
    acc[venda.pagamento] = (acc[venda.pagamento] || 0) + Number(venda.valor || 0);
    return acc;
  }, {});

  const destaque = Object.entries(pagamentos).sort((a, b) => b[1] - a[1])[0];

  totalPeriodoEl.textContent = formatMoney(totalPeriodo);
  vendasHojeEl.textContent = vendas.length;
  qtdVendasHojeEl.textContent = "vendas no filtro";
  itensVendidosEl.textContent = itensVendidos;

  const labels = {
    all: "Todo o histórico",
    today: "Hoje",
    week: "Últimos 7 dias",
    month: "Últimos 30 dias",
    custom: "Período personalizado"
  };

  totalPeriodoLabelEl.textContent = labels[periodoAtual] || "Vendas no filtro atual";

  if (destaque) {
    pagamentoDestaqueEl.textContent = normalizePayment(destaque[0]);
    pagamentoDestaqueValorEl.textContent = formatMoney(destaque[1]);
  } else {
    pagamentoDestaqueEl.textContent = "-";
    pagamentoDestaqueValorEl.textContent = formatMoney(0);
  }
}

formVenda.addEventListener("submit", async (event) => {
  event.preventDefault();

  const produto = getProdutoSelecionado();

  if (!produto) {
    showFeedback("Selecione um produto.", "error");
    notifyToast(
      "warning",
      "triangle-alert",
      "Produto não selecionado",
      "Escolha um produto do estoque para registrar a venda."
    );
    buscarProdutoVendaInput.focus();
    renderProductDropdown(buscarProdutoVendaInput.value);
    return;
  }

  const quantidade = Number(quantidadeVendaInput.value);

  if (quantidade <= 0) {
    showFeedback("Informe uma quantidade válida.", "error");
    notifyToast(
      "warning",
      "triangle-alert",
      "Quantidade inválida",
      "Informe uma quantidade maior que zero."
    );
    return;
  }

  if (!pagamentoVendaInput.value) {
    showFeedback("Selecione a forma de pagamento.", "error");
    notifyToast(
      "warning",
      "credit-card",
      "Pagamento obrigatório",
      "Selecione a forma de pagamento da venda."
    );
    return;
  }

  if (quantidade > Number(produto.stock)) {
    showFeedback(`Estoque insuficiente. Disponível: ${produto.stock}.`, "error");
    notifyToast(
      "warning",
      "package-x",
      "Estoque insuficiente",
      `Disponível no estoque: ${produto.stock} unidade(s).`
    );
    return;
  }

  const body = {
    productId: produto.id,
    quantidade,
    pagamento: pagamentoVendaInput.value
  };

  try {
    const response = await fetch(VENDAS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      showFeedback(result.error || "Erro ao registrar venda.", "error");
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao registrar venda",
        result.error || "Não foi possível concluir a venda."
      );
      return;
    }

    formVenda.reset();
    limparProdutoSelecionado();
    quantidadeVendaInput.value = 1;

    showFeedback("Venda registrada com sucesso!");

    notifyToast(
      "success",
      "check",
      "Venda registrada",
      "O estoque foi atualizado automaticamente."
    );

    await carregarProdutos();
    await carregarVendas();
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

buscarProdutoVendaInput.addEventListener("input", () => {
  produtoVendaInput.value = "";
  categoriaVendaInput.value = "";
  precoUnitarioInput.value = "";
  quantidadeVendaInput.removeAttribute("max");

  limparProdutoVendaBtn.hidden = buscarProdutoVendaInput.value.trim() === "";

  renderProductDropdown(buscarProdutoVendaInput.value);
});

buscarProdutoVendaInput.addEventListener("focus", () => {
  renderProductDropdown(buscarProdutoVendaInput.value);
});

limparProdutoVendaBtn.addEventListener("click", limparProdutoSelecionado);

qtyMinusBtn.addEventListener("click", () => {
  const atual = Number(quantidadeVendaInput.value || 1);
  quantidadeVendaInput.value = Math.max(1, atual - 1);
});

qtyPlusBtn.addEventListener("click", () => {
  const produto = getProdutoSelecionado();
  const atual = Number(quantidadeVendaInput.value || 1);
  const max = produto ? Number(produto.stock) : Infinity;

  quantidadeVendaInput.value = Math.min(max, atual + 1);
});

document.addEventListener("click", (event) => {
  const clickedInsideProductSearch = event.target.closest(".product-combobox");

  if (!clickedInsideProductSearch && productDropdown) {
    productDropdown.hidden = true;
  }
});

buscarVendaInput.addEventListener("input", () => {
  resetarPagina();
  renderizarVendas();
});

filtroCategoriaInput.addEventListener("change", () => {
  resetarPagina();
  renderizarVendas();
});

filtroPagamentoInput.addEventListener("change", () => {
  resetarPagina();
  renderizarVendas();
});

ordenarVendasInput.addEventListener("change", () => {
  resetarPagina();
  renderizarVendas();
});

periodButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    periodButtons.forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");

    periodoAtual = btn.dataset.period;

    if (periodoAtual === "custom") {
      customDateBox.hidden = false;
      return;
    }

    customDateBox.hidden = true;
    dataInicialCustom = null;
    dataFinalCustom = null;
    dataInicialInput.value = "";
    dataFinalInput.value = "";

    resetarPagina();
    renderizarVendas();
  });
});

aplicarDataBtn.addEventListener("click", () => {
  dataInicialCustom = dataInicialInput.value;
  dataFinalCustom = dataFinalInput.value;

  if (!dataInicialCustom || !dataFinalCustom) {
    notifyToast(
      "warning",
      "calendar-alert",
      "Filtro incompleto",
      "Escolha a data inicial e final."
    );
    return;
  }

  if (dataInicialCustom > dataFinalCustom) {
    notifyToast(
      "warning",
      "calendar-alert",
      "Datas inválidas",
      "A data inicial não pode ser maior que a final."
    );
    return;
  }

  resetarPagina();
  renderizarVendas();

  notifyToast(
    "success",
    "check",
    "Filtro aplicado",
    "As vendas foram filtradas pelo período escolhido."
  );
});

prevPageBtn.addEventListener("click", () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    renderizarVendas();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPaginas = Math.max(1, Math.ceil(obterVendasTratadas().length / itensPorPagina));

  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    renderizarVendas();
  }
});

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

aplicarTemaSalvo();
carregarProdutos();
carregarVendas();

if (window.lucide) {
  lucide.createIcons();
}