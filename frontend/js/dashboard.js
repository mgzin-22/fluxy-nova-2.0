const API_URL = "https://fluxy-api-r0lt.onrender.com";
const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const formVenda = document.getElementById("form-venda");
const produtoInput = document.getElementById("produto");
const valorInput = document.getElementById("valor");
const pagamentoInput = document.getElementById("pagamento");
const listaVendas = document.getElementById("lista-vendas");
const feedback = document.getElementById("feedback");

const totalGeral = document.getElementById("total-geral");
const totalQtd = document.getElementById("total-qtd");
const totalPix = document.getElementById("total-pix");
const totalDinheiro = document.getElementById("total-dinheiro");
const totalCartao = document.getElementById("total-cartao");
const userName = document.getElementById("user-name");
const themeBtn = document.getElementById("toggle-theme");

const filterButtons = document.querySelectorAll(".filter-btn");
const customFilterBox = document.getElementById("custom-filter-box");
const dataInicialInput = document.getElementById("data-inicial");
const dataFinalInput = document.getElementById("data-final");
const aplicarFiltroDataBtn = document.getElementById("aplicar-filtro-data");

let dataInicialCustom = null;
let dataFinalCustom = null;
let graficoLinha = null;
let graficoPizza = null;
let vendasGlobais = [];
let filtroAtual = "all";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

function formatMoney(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function protegerDashboard() {
  if (!getToken()) {
    window.location.href = "auth.html";
  }
}

function aplicarTemaSalvo() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";

  document.body.classList.toggle("light", savedTheme === "light");
  themeBtn.textContent = savedTheme === "light" ? "☀️" : "🌙";
}

function alternarTema() {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");

  themeBtn.textContent = isLight ? "☀️" : "🌙";

  aplicarFiltro();
}

function preencherUsuario() {
  const user = getUser();

  if (user?.businessName) {
    userName.textContent = user.businessName;
    return;
  }

  if (user?.name) {
    userName.textContent = `Bem-vindo(a), ${user.name}`;
  }
}

function showFeedback(message, type = "success") {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;

  setTimeout(() => {
    feedback.textContent = "";
    feedback.className = "feedback";
  }, 2500);
}

async function carregarVendas() {
  try {
    const response = await fetch(`${API_URL}/vendas`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    if (response.status === 401) {
      sair();
      return;
    }

    vendasGlobais = await response.json();
    aplicarFiltro();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao carregar vendas.", "error");
  }
}

function filtrarVendas(vendas, filtro) {
  const hoje = new Date();

  const inicioHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  const inicioSemana = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate() - 7
  );

  const inicioMes = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1
  );

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
      if (!dataInicialCustom || !dataFinalCustom) {
        return true;
      }

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
  renderizarLista(vendasFiltradas);
  gerarGraficos(vendasFiltradas);
}

function renderizarCards(vendas) {
  let total = 0;
  let pix = 0;
  let dinheiro = 0;
  let cartao = 0;

  vendas.forEach((venda) => {
    const valor = Number(venda.valor);

    total += valor;

    if (venda.pagamento === "pix") pix += valor;
    if (venda.pagamento === "dinheiro") dinheiro += valor;
    if (venda.pagamento === "cartao") cartao += valor;
  });

  totalGeral.textContent = formatMoney(total);
  totalQtd.textContent = vendas.length;
  totalPix.textContent = formatMoney(pix);
  totalDinheiro.textContent = formatMoney(dinheiro);
  totalCartao.textContent = formatMoney(cartao);
}

function renderizarLista(vendas) {
  listaVendas.innerHTML = "";

  if (!vendas.length) {
    listaVendas.innerHTML = `<p class="empty">Nenhuma venda encontrada para esse período.</p>`;
    return;
  }

  vendas.forEach((venda) => {
    const item = document.createElement("article");
    item.className = "sale-item";

    const data = new Date(venda.createdAt).toLocaleDateString("pt-BR");

    item.innerHTML = `
      <div>
        <strong>${venda.produto}</strong>
        <small>${venda.pagamento.toUpperCase()} • ${data}</small>
      </div>

      <div class="sale-value">
        ${formatMoney(Number(venda.valor))}
      </div>
    `;

    listaVendas.appendChild(item);
  });
}

async function criarVenda(event) {
  event.preventDefault();

  const produto = produtoInput.value.trim();
  const valor = Number(valorInput.value);
  const pagamento = pagamentoInput.value;

  if (!produto || !valor || valor <= 0) {
    showFeedback("Preencha os dados da venda corretamente.", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/vendas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        produto,
        valor,
        pagamento
      })
    });

    const result = await response.json();

    if (!response.ok) {
      showFeedback(result.error || "Erro ao salvar venda.", "error");
      return;
    }

    formVenda.reset();
    pagamentoInput.value = "pix";

    showFeedback("Venda salva com sucesso!", "success");

    await carregarVendas();
  } catch (error) {
    console.error(error);
    showFeedback("Erro ao conectar com servidor.", "error");
  }
}

function gerarGraficos(vendas) {
  const dias = {};
  let pix = 0;
  let dinheiro = 0;
  let cartao = 0;

  vendas.forEach((venda) => {
    const data = new Date(venda.createdAt).toLocaleDateString("pt-BR");
    const valor = Number(venda.valor);

    dias[data] = (dias[data] || 0) + valor;

    if (venda.pagamento === "pix") pix += valor;
    if (venda.pagamento === "dinheiro") dinheiro += valor;
    if (venda.pagamento === "cartao") cartao += valor;
  });

  if (graficoLinha) graficoLinha.destroy();
  if (graficoPizza) graficoPizza.destroy();

  graficoLinha = new Chart(document.getElementById("grafico-linha"), {
    type: "line",
    data: {
      labels: Object.keys(dias),
      datasets: [
        {
          label: "Vendas",
          data: Object.values(dias),
          borderColor: "#3498db",
          backgroundColor: "rgba(52,152,219,0.18)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  graficoPizza = new Chart(document.getElementById("grafico-pizza"), {
    type: "doughnut",
    data: {
      labels: ["Pix", "Dinheiro", "Cartão"],
      datasets: [
        {
          data: [pix, dinheiro, cartao],
          backgroundColor: ["#1abc9c", "#3498db", "#9b59b6"],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
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
      showFeedback("Escolha a data inicial e final.", "error");
      return;
    }

    if (dataInicialCustom > dataFinalCustom) {
      showFeedback("A data inicial não pode ser maior que a final.", "error");
      return;
    }

    aplicarFiltro();
  });
}

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

if (window.lucide) {
  lucide.createIcons();
}

protegerDashboard();
aplicarTemaSalvo();
preencherUsuario();
configurarFiltros();
carregarVendas();

themeBtn.addEventListener("click", alternarTema);
formVenda.addEventListener("submit", criarVenda);