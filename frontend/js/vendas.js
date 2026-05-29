const API_BASE = "https://fluxy-api-r0lt.onrender.com";
const PRODUCTS_API = `${API_BASE}/products`;
const VENDAS_API = `${API_BASE}/vendas`;

const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const token = localStorage.getItem(TOKEN_KEY);

const themeBtn = document.getElementById("toggle-theme");
const formVenda = document.getElementById("form-venda");
const produtoVendaInput = document.getElementById("produto-venda");
const categoriaVendaInput = document.getElementById("categoria-venda");
const quantidadeVendaInput = document.getElementById("quantidade-venda");
const precoUnitarioInput = document.getElementById("preco-unitario");
const pagamentoVendaInput = document.getElementById("pagamento-venda");
const vendasFeedback = document.getElementById("vendas-feedback");

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
let periodoAtual = "all";
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

function getProdutoSelecionado() {
  return produtosGlobais.find((produto) => produto.id === produtoVendaInput.value);
}

function atualizarProdutoSelecionado() {
  const produto = getProdutoSelecionado();

  if (!produto) {
    categoriaVendaInput.value = "";
    precoUnitarioInput.value = "";
    return;
  }

  categoriaVendaInput.value = produto.category || "Sem categoria";
  precoUnitarioInput.value = formatMoney(produto.price);
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

    produtoVendaInput.innerHTML = `<option value="">Selecione um produto</option>`;

    produtosGlobais.forEach((produto) => {
      const option = document.createElement("option");
      option.value = produto.id;
      option.textContent = `${produto.name} - Estoque: ${produto.stock}`;
      option.disabled = Number(produto.stock) <= 0;
      produtoVendaInput.appendChild(option);
    });
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
      return dataVenda >= seteDiasAtras;
    }

    if (periodoAtual === "month") {
      return (
        dataVenda.getMonth() === agora.getMonth() &&
        dataVenda.getFullYear() === agora.getFullYear()
      );
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
    month: "Mês atual",
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
    categoriaVendaInput.value = "";
    precoUnitarioInput.value = "";
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

produtoVendaInput.addEventListener("change", atualizarProdutoSelecionado);

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

if (themeBtn) {
  themeBtn.addEventListener("click", alternarTema);
}

if (window.lucide) {
  lucide.createIcons();
}