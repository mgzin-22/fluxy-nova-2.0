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
const filtroPagamentoInput = document.getElementById("filtro-pagamento");
const periodButtons = document.querySelectorAll(".period-btn");

const vendasHojeEl = document.getElementById("vendas-hoje");
const qtdVendasHojeEl = document.getElementById("qtd-vendas-hoje");
const totalPeriodoEl = document.getElementById("total-periodo");
const itensVendidosEl = document.getElementById("itens-vendidos");
const pagamentoDestaqueEl = document.getElementById("pagamento-destaque");
const pagamentoDestaqueValorEl = document.getElementById("pagamento-destaque-valor");

let produtosGlobais = [];
let vendasGlobais = [];
let periodoAtual = "all";

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
      return;
    }

    vendasGlobais = Array.isArray(data) ? data : [];

    renderizarVendas();
    atualizarResumo();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com vendas.", "error");
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

    return true;
  });
}

function filtrarVendas() {
  const termo = buscarVendaInput.value.trim().toLowerCase();
  const pagamento = filtroPagamentoInput.value;

  return filtrarPorPeriodo(vendasGlobais).filter((venda) => {
    const produto = venda.produto?.toLowerCase() || "";
    const categoria = venda.categoria?.toLowerCase() || "";

    const bateTexto = produto.includes(termo) || categoria.includes(termo);
    const batePagamento = pagamento === "todos" || venda.pagamento === pagamento;

    return bateTexto && batePagamento;
  });
}

function renderizarVendas() {
  const vendas = filtrarVendas();

  listaVendas.innerHTML = "";

  if (!vendas.length) {
    listaVendas.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Nenhuma venda encontrada.</td>
      </tr>
    `;
    return;
  }

  vendas.forEach((venda) => {
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
}

function atualizarResumo() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasHoje = vendasGlobais.filter((venda) => new Date(venda.createdAt) >= hoje);

  const totalHoje = vendasHoje.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
  const totalPeriodo = vendasGlobais.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
  const itensVendidos = vendasGlobais.reduce((sum, venda) => sum + Number(venda.quantidade || 1), 0);

  const pagamentos = vendasGlobais.reduce((acc, venda) => {
    acc[venda.pagamento] = (acc[venda.pagamento] || 0) + Number(venda.valor || 0);
    return acc;
  }, {});

  const destaque = Object.entries(pagamentos).sort((a, b) => b[1] - a[1])[0];

  vendasHojeEl.textContent = formatMoney(totalHoje);
  qtdVendasHojeEl.textContent = `${vendasHoje.length} vendas`;
  totalPeriodoEl.textContent = formatMoney(totalPeriodo);
  itensVendidosEl.textContent = itensVendidos;

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
    return;
  }

  const quantidade = Number(quantidadeVendaInput.value);

  if (quantidade <= 0) {
    showFeedback("Informe uma quantidade válida.", "error");
    return;
  }

  if (quantidade > Number(produto.stock)) {
    showFeedback(`Estoque insuficiente. Disponível: ${produto.stock}.`, "error");
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
      return;
    }

    formVenda.reset();
    categoriaVendaInput.value = "";
    precoUnitarioInput.value = "";
    quantidadeVendaInput.value = 1;

    showFeedback("Venda registrada com sucesso!");

    await carregarProdutos();
    await carregarVendas();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com servidor.", "error");
  }
});

produtoVendaInput.addEventListener("change", atualizarProdutoSelecionado);
buscarVendaInput.addEventListener("input", renderizarVendas);
filtroPagamentoInput.addEventListener("change", renderizarVendas);

periodButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    periodButtons.forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");
    periodoAtual = btn.dataset.period;
    renderizarVendas();
  });
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