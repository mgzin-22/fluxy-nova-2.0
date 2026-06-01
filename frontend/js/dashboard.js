const API_URL = "https://fluxy-api-r0lt.onrender.com";
const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const userName = document.getElementById("user-name");
const dashboardBusinessTitle = document.getElementById("dashboard-business-title");
const dashboardBusinessLogoImg = document.getElementById("dashboard-business-logo-img");
const dashboardBusinessLogoPlaceholder = document.getElementById("dashboard-business-logo-placeholder");

const totalVendidoEl = document.getElementById("total-vendido");
const vendasHojeEl = document.getElementById("vendas-hoje");
const qtdVendasHojeEl = document.getElementById("qtd-vendas-hoje");
const itensVendidosEl = document.getElementById("itens-vendidos");
const estoqueBaixoEl = document.getElementById("estoque-baixo");
const estoqueBaixoLabelEl = document.getElementById("estoque-baixo-label");
const alertCountEl = document.getElementById("alert-count");

const totalPeriodoLabelEl = document.getElementById("total-periodo-label");
const chartTotalLabelEl = document.getElementById("chart-total-label");
const categoryTotalLabelEl = document.getElementById("category-total-label");

const resumoPixEl = document.getElementById("resumo-pix");
const resumoCartaoEl = document.getElementById("resumo-cartao");
const resumoDinheiroEl = document.getElementById("resumo-dinheiro");

const produtosMaisVendidosEl = document.getElementById("produtos-mais-vendidos");
const produtosEstoqueBaixoEl = document.getElementById("produtos-estoque-baixo");
const vendasRecentesEl = document.getElementById("vendas-recentes");
const insightTextEl = document.getElementById("insight-text");

const filterButtons = document.querySelectorAll(".filter-btn");
const customFilterBox = document.getElementById("custom-filter-box");
const dataInicialInput = document.getElementById("data-inicial");
const dataFinalInput = document.getElementById("data-final");
const aplicarFiltroDataBtn = document.getElementById("aplicar-filtro-data");

const notificationBtn = document.getElementById("notification-btn");
const notificationDropdown = document.getElementById("notification-dropdown");
const closeNotificationsBtn = document.getElementById("close-notifications");
const notificationList = document.getElementById("notification-list");

let graficoLinha = null;
let graficoPizza = null;
let graficoCategoria = null;

let vendasGlobais = [];
let produtosGlobais = [];
let filtroAtual = "month";
let dataInicialCustom = null;
let dataFinalCustom = null;
let toastInicialMostrado = false;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

function protegerDashboard() {
  if (!getToken()) {
    window.location.href = "auth.html";
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

function getProductInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "P";
}

function aplicarTemaSalvo() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  document.body.classList.toggle("light", savedTheme === "light");
}

function renderBusinessLogoDashboard(url) {
  if (!dashboardBusinessLogoImg || !dashboardBusinessLogoPlaceholder) return;

  if (url) {
    dashboardBusinessLogoImg.src = url;
    dashboardBusinessLogoImg.hidden = false;
    dashboardBusinessLogoPlaceholder.hidden = true;
    return;
  }

  dashboardBusinessLogoImg.src = "";
  dashboardBusinessLogoImg.hidden = true;
  dashboardBusinessLogoPlaceholder.hidden = false;
}

function preencherUsuario() {
  const user = getUser();

  if (dashboardBusinessTitle) {
    dashboardBusinessTitle.textContent = user?.businessName || "Dashboard";
  }

  renderBusinessLogoDashboard(user?.businessLogoUrl);

  if (user?.businessName) {
    userName.textContent = "Visão geral do seu negócio";
    return;
  }

  if (user?.name) {
    userName.textContent = `Bem-vindo(a), ${user.name}`;
    return;
  }

  userName.textContent = "Visão geral do seu negócio";
}

async function carregarPerfilUsuario() {
  try {
    const response = await fetch(`${API_URL}/user/me`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await response.json();

    if (!response.ok) return;

    localStorage.setItem(USER_KEY, JSON.stringify(data));
    preencherUsuario();
  } catch (error) {
    console.warn("Não foi possível carregar o perfil do usuário.", error);
  }
}

async function carregarDados() {
  try {
    const headers = {
      Authorization: `Bearer ${getToken()}`
    };

    const [vendasResponse, produtosResponse] = await Promise.all([
      fetch(`${API_URL}/vendas`, { headers }),
      fetch(`${API_URL}/products`, { headers })
    ]);

    if (vendasResponse.status === 401 || produtosResponse.status === 401) {
      sair();
      return;
    }

    const vendasData = await vendasResponse.json();
    const produtosData = await produtosResponse.json();

    if (!vendasResponse.ok) {
      console.error("Erro vendas:", vendasData);
      vendasGlobais = [];

      showToast({
        type: "danger",
        icon: "circle-alert",
        title: "Erro ao carregar vendas",
        message: vendasData.error || "Não foi possível buscar as vendas."
      });
    } else {
      vendasGlobais = Array.isArray(vendasData) ? vendasData : [];
    }

    if (!produtosResponse.ok) {
      console.error("Erro produtos:", produtosData);
      produtosGlobais = [];

      showToast({
        type: "danger",
        icon: "circle-alert",
        title: "Erro ao carregar estoque",
        message: produtosData.error || "Não foi possível buscar os produtos."
      });
    } else {
      produtosGlobais = Array.isArray(produtosData) ? produtosData : [];
    }

    aplicarFiltro();
  } catch (error) {
    console.error(error);
    vendasGlobais = [];
    produtosGlobais = [];

    showToast({
      type: "danger",
      icon: "wifi-off",
      title: "Erro de conexão",
      message: "Não foi possível conectar com o servidor."
    });

    aplicarFiltro();
  }
}

function filtrarVendas(vendas, filtro) {
  const hoje = new Date();

  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioSemana = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 7);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  return vendas.filter((venda) => {
    const dataVenda = new Date(venda.createdAt);

    if (filtro === "today") {
      return dataVenda >= inicioHoje;
    }

    if (filtro === "week") {
      return dataVenda >= inicioSemana;
    }

    if (filtro === "month") {
      return dataVenda >= inicioMes;
    }

    if (filtro === "custom") {
      if (!dataInicialCustom || !dataFinalCustom) return true;

      const inicio = new Date(`${dataInicialCustom}T00:00:00`);
      const fim = new Date(`${dataFinalCustom}T23:59:59`);

      return dataVenda >= inicio && dataVenda <= fim;
    }

    return true;
  });
}

function aplicarFiltro() {
  const vendasFiltradas = filtrarVendas(vendasGlobais, filtroAtual);

  renderizarCards(vendasFiltradas);
  renderizarGraficos(vendasFiltradas);
  renderizarProdutosMaisVendidos(vendasFiltradas);
  renderizarProdutosEstoqueBaixo();
  renderizarVendasRecentes();
  renderizarInsight(vendasFiltradas);
  gerarNotificacoes(vendasFiltradas);
}

function renderizarCards(vendas) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasHoje = vendasGlobais.filter((venda) => new Date(venda.createdAt) >= hoje);

  const totalPeriodo = vendas.reduce((total, venda) => total + Number(venda.valor || 0), 0);
  const totalHoje = vendasHoje.reduce((total, venda) => total + Number(venda.valor || 0), 0);
  const itensVendidos = vendas.reduce((total, venda) => total + Number(venda.quantidade || 1), 0);

  const produtosBaixo = produtosGlobais.filter((produto) => {
    const minStock = Number(produto.minStock || 0);
    return minStock > 0 && Number(produto.stock) <= minStock;
  });

  totalVendidoEl.textContent = formatMoney(totalPeriodo);
  vendasHojeEl.textContent = formatMoney(totalHoje);
  qtdVendasHojeEl.textContent = `${vendasHoje.length} vendas realizadas`;
  itensVendidosEl.textContent = itensVendidos;
  estoqueBaixoEl.textContent = produtosBaixo.length;
  estoqueBaixoLabelEl.textContent = produtosBaixo.length === 1 ? "Produto em atenção" : "Produtos em atenção";
  alertCountEl.textContent = produtosBaixo.length;

  const labels = {
    today: "Hoje",
    week: "Últimos 7 dias",
    month: "Mês atual",
    all: "Todo o histórico",
    custom: "Período personalizado"
  };

  totalPeriodoLabelEl.textContent = labels[filtroAtual] || "No período selecionado";
  chartTotalLabelEl.textContent = formatMoney(totalPeriodo);

  if (categoryTotalLabelEl) {
    categoryTotalLabelEl.textContent = formatMoney(totalPeriodo);
  }
}

function agruparVendasPorDia(vendas) {
  const dias = {};

  vendas.forEach((venda) => {
    const data = new Date(venda.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });

    dias[data] = (dias[data] || 0) + Number(venda.valor || 0);
  });

  return dias;
}

function renderizarGraficos(vendas) {
  const dias = agruparVendasPorDia(vendas);

  let pix = 0;
  let dinheiro = 0;
  let cartao = 0;

  const categorias = {};

  vendas.forEach((venda) => {
    const valor = Number(venda.valor || 0);
    const categoria = venda.categoria || venda.product?.category || "Sem categoria";

    if (venda.pagamento === "pix") pix += valor;
    if (venda.pagamento === "dinheiro") dinheiro += valor;
    if (venda.pagamento === "cartao") cartao += valor;

    categorias[categoria] = (categorias[categoria] || 0) + valor;
  });

  resumoPixEl.textContent = formatMoney(pix);
  resumoCartaoEl.textContent = formatMoney(cartao);
  resumoDinheiroEl.textContent = formatMoney(dinheiro);

  if (graficoLinha) graficoLinha.destroy();
  if (graficoPizza) graficoPizza.destroy();
  if (graficoCategoria) graficoCategoria.destroy();

  const lineCtx = document.getElementById("grafico-linha");
  const pieCtx = document.getElementById("grafico-pizza");
  const categoryCtx = document.getElementById("grafico-categoria");

  const fluxyColors = ["#3498db", "#1abc9c", "#22c55e", "#f59e0b", "#60a5fa"];

  graficoLinha = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: Object.keys(dias),
      datasets: [
        {
          label: "Vendas",
          data: Object.values(dias),
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.2)",
          tension: 0.45,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => formatMoney(context.raw)
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "rgba(148, 163, 184, 0.08)"
          }
        },
        y: {
          ticks: {
            color: "#94a3b8",
            callback: (value) => formatMoney(value)
          },
          grid: {
            color: "rgba(148, 163, 184, 0.08)"
          }
        }
      }
    }
  });

  graficoPizza = new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: ["Pix", "Cartão", "Dinheiro"],
      datasets: [
        {
          data: [pix, cartao, dinheiro],
          backgroundColor: ["#3498db", "#1abc9c", "#22c55e"],
          borderWidth: 0,
          hoverOffset: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${formatMoney(context.raw)}`
          }
        }
      }
    }
  });

  const categoriasOrdenadas = Object.entries(categorias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  graficoCategoria = new Chart(categoryCtx, {
    type: "bar",
    data: {
      labels: categoriasOrdenadas.map(([categoria]) => categoria),
      datasets: [
        {
          label: "Faturamento",
          data: categoriasOrdenadas.map(([, valor]) => valor),
          backgroundColor: fluxyColors,
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 54
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => formatMoney(context.raw)
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            font: {
              size: 12,
              weight: "600"
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
            callback: (value) => formatMoney(value)
          },
          grid: {
            color: "rgba(148, 163, 184, 0.08)"
          }
        }
      }
    }
  });
}

function buscarProdutoPorNome(nome) {
  return produtosGlobais.find((produto) => produto.name === nome);
}

function renderizarProdutosMaisVendidos(vendas) {
  const ranking = {};

  vendas.forEach((venda) => {
    const nome = venda.produto || "Produto";

    if (!ranking[nome]) {
      ranking[nome] = {
        nome,
        quantidade: 0,
        valor: 0,
        produto: venda.product || buscarProdutoPorNome(nome)
      };
    }

    ranking[nome].quantidade += Number(venda.quantidade || 1);
    ranking[nome].valor += Number(venda.valor || 0);
  });

  const produtos = Object.values(ranking)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  produtosMaisVendidosEl.innerHTML = "";

  if (!produtos.length) {
    produtosMaisVendidosEl.innerHTML = `<p class="empty">Nenhum produto vendido nesse período.</p>`;
    return;
  }

  produtos.forEach((item, index) => {
    const avatar = item.produto?.imageUrl
      ? `<img src="${item.produto.imageUrl}" alt="${item.nome}">`
      : getProductInitial(item.nome);

    const el = document.createElement("div");
    el.className = "ranking-item";

    el.innerHTML = `
      <div class="item-left">
        <span class="rank-number">${index + 1}</span>

        <span class="product-thumb">${avatar}</span>

        <div class="item-info">
          <strong>${item.nome}</strong>
          <small>${item.quantidade} un. vendidas</small>
        </div>
      </div>

      <span class="item-value">${formatMoney(item.valor)}</span>
    `;

    produtosMaisVendidosEl.appendChild(el);
  });
}

function renderizarProdutosEstoqueBaixo() {
  const produtosBaixo = produtosGlobais
    .filter((produto) => {
      const minStock = Number(produto.minStock || 0);
      return minStock > 0 && Number(produto.stock) <= minStock;
    })
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .slice(0, 5);

  produtosEstoqueBaixoEl.innerHTML = "";

  if (!produtosBaixo.length) {
    produtosEstoqueBaixoEl.innerHTML = `<p class="empty">Nenhum produto em estoque baixo.</p>`;
    return;
  }

  produtosBaixo.forEach((produto) => {
    const avatar = produto.imageUrl
      ? `<img src="${produto.imageUrl}" alt="${produto.name}">`
      : getProductInitial(produto.name);

    const isCritical = Number(produto.stock) <= 0;

    const el = document.createElement("div");
    el.className = "low-stock-item";

    el.innerHTML = `
      <div class="item-left">
        <span class="product-thumb">${avatar}</span>

        <div class="item-info">
          <strong>${produto.name}</strong>
          <small>Estoque mínimo: ${produto.minStock || 0}</small>
        </div>
      </div>

      <span class="low-badge ${isCritical ? "critical" : ""}">
        ${produto.stock} un.
      </span>
    `;

    produtosEstoqueBaixoEl.appendChild(el);
  });
}

function renderizarVendasRecentes() {
  const vendas = [...vendasGlobais]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  vendasRecentesEl.innerHTML = "";

  if (!vendas.length) {
    vendasRecentesEl.innerHTML = `<p class="empty">Nenhuma venda registrada ainda.</p>`;
    return;
  }

  vendas.forEach((venda) => {
    const produto = venda.product || buscarProdutoPorNome(venda.produto);

    const avatar = produto?.imageUrl
      ? `<img src="${produto.imageUrl}" alt="${venda.produto}">`
      : getProductInitial(venda.produto);

    const el = document.createElement("div");
    el.className = "recent-sale-item";

    el.innerHTML = `
      <div class="item-left">
        <span class="product-thumb">${avatar}</span>

        <div class="item-info">
          <strong>${venda.produto}</strong>
          <small>${formatDate(venda.createdAt)}</small>
        </div>
      </div>

      <span class="payment-badge ${venda.pagamento}">
        ${normalizePayment(venda.pagamento)}
      </span>

      <span class="item-value">${formatMoney(venda.valor)}</span>
    `;

    vendasRecentesEl.appendChild(el);
  });
}

function renderizarInsight(vendas) {
  if (!vendas.length) {
    insightTextEl.textContent = "Registre novas vendas para que a Fluxy gere uma visão rápida do desempenho do negócio.";
    return;
  }

  const total = vendas.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
  const ranking = {};

  vendas.forEach((venda) => {
    ranking[venda.produto] = (ranking[venda.produto] || 0) + Number(venda.quantidade || 1);
  });

  const produtoCampeao = Object.entries(ranking).sort((a, b) => b[1] - a[1])[0];

  insightTextEl.textContent = produtoCampeao
    ? `No período selecionado, você vendeu ${formatMoney(total)}. O produto "${produtoCampeao[0]}" foi o destaque em quantidade vendida.`
    : `No período selecionado, você vendeu ${formatMoney(total)}.`;
}

function criarNotificacao({ type = "info", icon = "bell", title, message }) {
  const item = document.createElement("div");
  item.className = "notification-item";

  item.innerHTML = `
    <span class="notification-item-icon ${type}">
      <i data-lucide="${icon}"></i>
    </span>

    <div>
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;

  return item;
}

function gerarNotificacoes(vendasFiltradas) {
  const notificacoes = [];

  const produtosSemEstoque = produtosGlobais.filter((produto) => Number(produto.stock) <= 0);

  const produtosEstoqueBaixo = produtosGlobais.filter((produto) => {
    const minStock = Number(produto.minStock || 0);
    return minStock > 0 && Number(produto.stock) > 0 && Number(produto.stock) <= minStock;
  });

  produtosSemEstoque.slice(0, 3).forEach((produto) => {
    notificacoes.push({
      type: "danger",
      icon: "package-x",
      title: "Produto sem estoque",
      message: `${produto.name} chegou a 0 unidades. Reponha para continuar vendendo.`
    });
  });

  produtosEstoqueBaixo.slice(0, 3).forEach((produto) => {
    notificacoes.push({
      type: "warning",
      icon: "triangle-alert",
      title: "Estoque baixo",
      message: `${produto.name} está com ${produto.stock} unidades. Estoque mínimo: ${produto.minStock}.`
    });
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasHoje = vendasGlobais.filter((venda) => new Date(venda.createdAt) >= hoje);

  if (vendasHoje.length > 0) {
    const totalHoje = vendasHoje.reduce((total, venda) => total + Number(venda.valor || 0), 0);

    notificacoes.push({
      type: "success",
      icon: "trending-up",
      title: "Movimento de hoje",
      message: `Hoje você já registrou ${vendasHoje.length} venda(s), somando ${formatMoney(totalHoje)}.`
    });
  }

  const ranking = {};

  vendasFiltradas.forEach((venda) => {
    ranking[venda.produto] = (ranking[venda.produto] || 0) + Number(venda.quantidade || 1);
  });

  const produtoCampeao = Object.entries(ranking).sort((a, b) => b[1] - a[1])[0];

  if (produtoCampeao) {
    notificacoes.push({
      type: "info",
      icon: "sparkles",
      title: "Produto em destaque",
      message: `${produtoCampeao[0]} é o produto mais vendido do período, com ${produtoCampeao[1]} unidade(s).`
    });
  }

  if (!toastInicialMostrado && notificacoes.length > 0) {
    const alertaPrincipal = notificacoes[0];

    showToast({
      type: alertaPrincipal.type,
      icon: alertaPrincipal.icon,
      title: alertaPrincipal.title,
      message: alertaPrincipal.message
    });

    toastInicialMostrado = true;
  }

  renderizarNotificacoes(notificacoes);
}

function renderizarNotificacoes(notificacoes) {
  notificationList.innerHTML = "";

  if (!notificacoes.length) {
    notificationList.innerHTML = `
      <div class="notification-empty">
        Nenhuma notificação importante no momento.
      </div>
    `;

    alertCountEl.textContent = "0";
    return;
  }

  notificacoes.forEach((notificacao) => {
    notificationList.appendChild(criarNotificacao(notificacao));
  });

  const alertasImportantes = notificacoes.filter((item) => {
    return item.type === "danger" || item.type === "warning";
  });

  alertCountEl.textContent = alertasImportantes.length || notificacoes.length;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function abrirNotificacoes() {
  notificationDropdown.hidden = !notificationDropdown.hidden;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function fecharNotificacoes() {
  notificationDropdown.hidden = true;
}

function esconderFiltroPersonalizado() {
  if (customFilterBox) {
    customFilterBox.style.display = "none";
  }
}

function mostrarFiltroPersonalizado() {
  if (customFilterBox) {
    customFilterBox.style.display = "flex";
  }
}

function configurarFiltros() {
  esconderFiltroPersonalizado();

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));

      button.classList.add("active");
      filtroAtual = button.dataset.filter;

      if (filtroAtual === "custom") {
        mostrarFiltroPersonalizado();
        return;
      }

      esconderFiltroPersonalizado();

      dataInicialCustom = null;
      dataFinalCustom = null;

      if (dataInicialInput) dataInicialInput.value = "";
      if (dataFinalInput) dataFinalInput.value = "";

      aplicarFiltro();
    });
  });

  aplicarFiltroDataBtn.addEventListener("click", () => {
    dataInicialCustom = dataInicialInput.value;
    dataFinalCustom = dataFinalInput.value;

    if (!dataInicialCustom || !dataFinalCustom) {
      showToast({
        type: "warning",
        icon: "calendar-alert",
        title: "Filtro incompleto",
        message: "Escolha a data inicial e final."
      });
      return;
    }

    if (dataInicialCustom > dataFinalCustom) {
      showToast({
        type: "warning",
        icon: "calendar-alert",
        title: "Datas inválidas",
        message: "A data inicial não pode ser maior que a final."
      });
      return;
    }

    aplicarFiltro();

    showToast({
      type: "success",
      icon: "check",
      title: "Filtro aplicado",
      message: "O dashboard foi atualizado com o período selecionado."
    });
  });
}

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

protegerDashboard();
aplicarTemaSalvo();
preencherUsuario();
carregarPerfilUsuario();
configurarFiltros();
carregarDados();

if (notificationBtn) {
  notificationBtn.addEventListener("click", abrirNotificacoes);
}

if (closeNotificationsBtn) {
  closeNotificationsBtn.addEventListener("click", fecharNotificacoes);
}

document.addEventListener("click", (event) => {
  if (!notificationDropdown || !notificationBtn) return;

  const clickedInside =
    notificationDropdown.contains(event.target) ||
    notificationBtn.contains(event.target);

  if (!clickedInside) {
    fecharNotificacoes();
  }
});

if (window.lucide) {
  lucide.createIcons();
} 