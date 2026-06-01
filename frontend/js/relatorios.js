const API_BASE = "https://fluxy-api-r0lt.onrender.com";
const VENDAS_API = `${API_BASE}/vendas`;
const PRODUCTS_API = `${API_BASE}/products`;

const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";
const TERMS_KEY = "fluxy_terms_permissions";

const token = localStorage.getItem(TOKEN_KEY);

const filtersPanel = document.getElementById("filters-panel");
const openFiltersBtn = document.getElementById("open-filters");

const periodButtons = document.querySelectorAll(".period-btn");
const customDateBox = document.getElementById("custom-date-box");
const dataInicialInput = document.getElementById("data-inicial");
const dataFinalInput = document.getElementById("data-final");
const applyDateBtn = document.getElementById("apply-date");

const buscarInput = document.getElementById("buscar-relatorio");
const filtroCategoriaInput = document.getElementById("filtro-categoria");
const filtroPagamentoInput = document.getElementById("filtro-pagamento");
const ordenarInput = document.getElementById("ordenar-relatorio");
const clearFiltersBtn = document.getElementById("clear-filters");

const exportPdfBtn = document.getElementById("export-pdf");
const exportXlsxBtn = document.getElementById("export-xlsx");

const periodDisplay = document.getElementById("period-display");

const kpiFaturamento = document.getElementById("kpi-faturamento");
const kpiFaturamentoDesc = document.getElementById("kpi-faturamento-desc");
const kpiVendas = document.getElementById("kpi-vendas");
const kpiVendasDesc = document.getElementById("kpi-vendas-desc");
const kpiTicket = document.getElementById("kpi-ticket");
const kpiPagamento = document.getElementById("kpi-pagamento");
const kpiPagamentoDesc = document.getElementById("kpi-pagamento-desc");

const lineTotalLabel = document.getElementById("line-total-label");
const paymentLegend = document.getElementById("payment-legend");

const topProductsList = document.getElementById("top-products-list");
const categoryList = document.getElementById("category-list");
const tableCount = document.getElementById("table-count");
const listaRelatorio = document.getElementById("lista-relatorio");

const generateAiBtn = document.getElementById("generate-ai-analysis");
const aiAnalysisContent = document.getElementById("ai-analysis-content");
const aiAnalysisTime = document.getElementById("ai-analysis-time");
const aiQuestionInput = document.getElementById("ai-question");
const sendAiQuestionBtn = document.getElementById("send-ai-question");
const suggestionButtons = document.querySelectorAll(".fluxter-suggestions button");

let vendasGlobais = [];
let produtosGlobais = [];
let periodoAtual = "all";
let dataInicialCustom = null;
let dataFinalCustom = null;

let lineChart = null;
let paymentChart = null;

if (!token) {
  window.location.href = "auth.html";
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : {};
}

function getTerms() {
  const terms = localStorage.getItem(TERMS_KEY);

  return terms
    ? JSON.parse(terms)
    : {
        acceptedTerms: false,
        allowReports: true,
        allowAI: true,
        allowSmartNotifications: true
      };
}

function aplicarTemaSalvo() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  document.body.classList.toggle("light", savedTheme === "light");
}

function notifyToast(type, icon, title, message) {
  if (typeof showToast === "function") {
    showToast({ type, icon, title, message });
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

function formatDateShort(date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
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

function getPeriodLabel() {
  const labels = {
    all: "Todo o histórico",
    today: "Hoje",
    week: "Últimos 7 dias",
    month: "Mês atual",
    custom: "Período personalizado"
  };

  if (periodoAtual === "custom" && dataInicialCustom && dataFinalCustom) {
    return `${dataInicialCustom.split("-").reverse().join("/")} - ${dataFinalCustom.split("-").reverse().join("/")}`;
  }

  return labels[periodoAtual] || "Filtro atual";
}

async function carregarDados() {
  try {
    const headers = {
      Authorization: `Bearer ${token}`
    };

    const [vendasResponse, produtosResponse] = await Promise.all([
      fetch(VENDAS_API, { headers }),
      fetch(PRODUCTS_API, { headers })
    ]);

    if (vendasResponse.status === 401 || produtosResponse.status === 401) {
      sair();
      return;
    }

    const vendasData = await vendasResponse.json();
    const produtosData = await produtosResponse.json();

    vendasGlobais = vendasResponse.ok && Array.isArray(vendasData) ? vendasData : [];
    produtosGlobais = produtosResponse.ok && Array.isArray(produtosData) ? produtosData : [];

    if (!vendasResponse.ok) {
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao carregar vendas",
        vendasData.error || "Não foi possível carregar as vendas."
      );
    }

    if (!produtosResponse.ok) {
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao carregar produtos",
        produtosData.error || "Não foi possível carregar o estoque."
      );
    }

    atualizarCategorias();
    renderizarRelatorio();
    gerarAnaliseFluxter();

    notifyToast(
      "success",
      "message-circle",
      "Fluxter atualizado",
      "Os dados do relatório foram analisados."
    );
  } catch (error) {
    console.error(error);

    vendasGlobais = [];
    produtosGlobais = [];

    renderizarRelatorio();
    gerarAnaliseFluxter();

    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com o servidor."
    );
  }
}

function atualizarCategorias() {
  const categoriaAtual = filtroCategoriaInput.value;

  const categorias = [...new Set(
    vendasGlobais
      .map((venda) => venda.categoria || venda.product?.category)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "pt-BR"));

  filtroCategoriaInput.innerHTML = `<option value="todas">Todas as categorias</option>`;

  categorias.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    filtroCategoriaInput.appendChild(option);
  });

  if ([...filtroCategoriaInput.options].some((option) => option.value === categoriaAtual)) {
    filtroCategoriaInput.value = categoriaAtual;
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

function filtrarRelatorio() {
  const termo = buscarInput.value.trim().toLowerCase();
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

function ordenarRelatorio(vendas) {
  const ordenacao = ordenarInput.value;
  const vendasOrdenadas = [...vendas];

  switch (ordenacao) {
    case "recentes":
      return vendasOrdenadas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    case "antigas":
      return vendasOrdenadas.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    case "maior-valor":
      return vendasOrdenadas.sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));

    case "menor-valor":
      return vendasOrdenadas.sort((a, b) => Number(a.valor || 0) - Number(b.valor || 0));

    case "maior-quantidade":
      return vendasOrdenadas.sort((a, b) => Number(b.quantidade || 1) - Number(a.quantidade || 1));

    default:
      return vendasOrdenadas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

function obterVendasTratadas() {
  return ordenarRelatorio(filtrarRelatorio());
}

function agruparPorCampo(vendas, campo) {
  return vendas.reduce((acc, venda) => {
    const key = campo(venda) || "Não informado";

    if (!acc[key]) {
      acc[key] = {
        nome: key,
        quantidade: 0,
        valor: 0,
        item: venda.product || null
      };
    }

    acc[key].quantidade += Number(venda.quantidade || 1);
    acc[key].valor += Number(venda.valor || 0);

    return acc;
  }, {});
}

function objectToSortedArray(obj, sortBy = "valor") {
  return Object.values(obj).sort((a, b) => b[sortBy] - a[sortBy]);
}

function getResumo(vendas) {
  const total = vendas.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
  const quantidade = vendas.length;
  const itens = vendas.reduce((sum, venda) => sum + Number(venda.quantidade || 1), 0);
  const ticket = quantidade > 0 ? total / quantidade : 0;

  const pagamentos = objectToSortedArray(
    agruparPorCampo(vendas, (venda) => normalizePayment(venda.pagamento)),
    "valor"
  );

  const produtos = objectToSortedArray(
    agruparPorCampo(vendas, (venda) => venda.produto),
    "quantidade"
  );

  const categorias = objectToSortedArray(
    agruparPorCampo(vendas, (venda) => venda.categoria || venda.product?.category || "Sem categoria"),
    "valor"
  );

  return {
    total,
    quantidade,
    itens,
    ticket,
    pagamentos,
    produtos,
    categorias
  };
}

function renderizarRelatorio() {
  const vendas = obterVendasTratadas();
  const resumo = getResumo(vendas);

  periodDisplay.textContent = getPeriodLabel();

  renderizarKPIs(resumo);
  renderizarGraficos(vendas, resumo);
  renderizarProdutos(resumo.produtos);
  renderizarCategorias(resumo.categorias);
  renderizarTabela(vendas);

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderizarKPIs(resumo) {
  kpiFaturamento.textContent = formatMoney(resumo.total);
  kpiFaturamentoDesc.textContent = getPeriodLabel();

  kpiVendas.textContent = resumo.quantidade;
  kpiVendasDesc.textContent = "Registros encontrados";

  kpiTicket.textContent = formatMoney(resumo.ticket);

  if (resumo.pagamentos.length) {
    kpiPagamento.textContent = resumo.pagamentos[0].nome;
    kpiPagamentoDesc.textContent = formatMoney(resumo.pagamentos[0].valor);
  } else {
    kpiPagamento.textContent = "-";
    kpiPagamentoDesc.textContent = formatMoney(0);
  }

  lineTotalLabel.textContent = formatMoney(resumo.total);
}

function agruparPorDia(vendas) {
  return vendas.reduce((acc, venda) => {
    const dia = formatDateShort(venda.createdAt);
    acc[dia] = (acc[dia] || 0) + Number(venda.valor || 0);
    return acc;
  }, {});
}

function renderizarGraficos(vendas, resumo) {
  const dias = agruparPorDia(vendas);

  if (lineChart) lineChart.destroy();
  if (paymentChart) paymentChart.destroy();

  const lineCtx = document.getElementById("line-chart");
  const paymentCtx = document.getElementById("payment-chart");

  lineChart = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: Object.keys(dias),
      datasets: [
        {
          label: "Faturamento",
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
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatMoney(context.raw)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(148, 163, 184, 0.08)" }
        },
        y: {
          ticks: {
            color: "#94a3b8",
            callback: (value) => formatMoney(value)
          },
          grid: { color: "rgba(148, 163, 184, 0.08)" }
        }
      }
    }
  });

  const paymentLabels = resumo.pagamentos.map((item) => item.nome);
  const paymentValues = resumo.pagamentos.map((item) => item.valor);

  paymentChart = new Chart(paymentCtx, {
    type: "doughnut",
    data: {
      labels: paymentLabels,
      datasets: [
        {
          data: paymentValues,
          backgroundColor: ["#3498db", "#1abc9c", "#22c55e", "#f59e0b"],
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
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${formatMoney(context.raw)}`
          }
        }
      }
    }
  });

  paymentLegend.innerHTML = "";

  if (!resumo.pagamentos.length) {
    paymentLegend.innerHTML = `<p class="empty-small">Nenhum pagamento encontrado.</p>`;
    return;
  }

  resumo.pagamentos.forEach((item) => {
    const tipo = item.nome.toLowerCase().includes("pix")
      ? "pix"
      : item.nome.toLowerCase().includes("cart")
        ? "cartao"
        : "dinheiro";

    const percent = resumo.total > 0 ? (item.valor / resumo.total) * 100 : 0;

    const legendItem = document.createElement("div");
    legendItem.className = "payment-legend-item";

    legendItem.innerHTML = `
      <span class="payment-dot ${tipo}"></span>
      <span>${item.nome}</span>
      <strong>${percent.toFixed(0)}%</strong>
    `;

    paymentLegend.appendChild(legendItem);
  });
}

function renderizarProdutos(produtos) {
  topProductsList.innerHTML = "";

  if (!produtos.length) {
    topProductsList.innerHTML = `<p class="empty-small">Nenhum produto vendido no filtro atual.</p>`;
    return;
  }

  produtos.slice(0, 5).forEach((produto, index) => {
    const produtoBanco = produtosGlobais.find((item) => item.name === produto.nome);

    const imagem = produtoBanco?.imageUrl
      ? `<img src="${produtoBanco.imageUrl}" alt="${produto.nome}">`
      : getProductInitial(produto.nome);

    const item = document.createElement("div");
    item.className = "top-product-item";

    item.innerHTML = `
      <span class="rank-number">${index + 1}</span>

      <span class="product-mini">${imagem}</span>

      <div class="item-info">
        <strong>${produto.nome}</strong>
        <small>${formatMoney(produto.valor)}</small>
      </div>

      <span class="item-value">${produto.quantidade}</span>
    `;

    topProductsList.appendChild(item);
  });
}

function renderizarCategorias(categorias) {
  categoryList.innerHTML = "";

  if (!categorias.length) {
    categoryList.innerHTML = `<p class="empty-small">Nenhuma categoria encontrada no filtro atual.</p>`;
    return;
  }

  categorias.slice(0, 5).forEach((categoria) => {
    const item = document.createElement("div");
    item.className = "category-item";

    item.innerHTML = `
      <span class="category-icon">
        <i data-lucide="tag"></i>
      </span>

      <div class="item-info">
        <strong>${categoria.nome}</strong>
        <small>${categoria.quantidade} unidade(s) vendidas</small>
      </div>

      <span class="item-value">${formatMoney(categoria.valor)}</span>
    `;

    categoryList.appendChild(item);
  });
}

function renderizarTabela(vendas) {
  listaRelatorio.innerHTML = "";

  tableCount.textContent =
    vendas.length === 0
      ? "Nenhuma venda encontrada"
      : `${vendas.length} venda(s) encontradas`;

  if (!vendas.length) {
    listaRelatorio.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Nenhuma venda encontrada.</td>
      </tr>
    `;
    return;
  }

  vendas.slice(0, 12).forEach((venda) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${venda.produto || "-"}</td>

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

    listaRelatorio.appendChild(row);
  });
}

function getProdutosBaixoEstoque() {
  return produtosGlobais
    .filter((produto) => {
      const minStock = Number(produto.minStock || 0);
      return minStock > 0 && Number(produto.stock) <= minStock;
    })
    .sort((a, b) => Number(a.stock) - Number(b.stock));
}

function getProdutosSemEstoque() {
  return produtosGlobais.filter((produto) => Number(produto.stock || 0) <= 0);
}

function getIntencao(pergunta) {
  const texto = pergunta.toLowerCase();

  if (texto.includes("estoque") || texto.includes("repor") || texto.includes("reposição") || texto.includes("baixo") || texto.includes("acabando")) {
    return "estoque";
  }

  if (texto.includes("produto") || texto.includes("mais vendeu") || texto.includes("vendido") || texto.includes("campeão") || texto.includes("destaque")) {
    return "produto";
  }

  if (texto.includes("categoria") || texto.includes("segmento")) {
    return "categoria";
  }

  if (texto.includes("pagamento") || texto.includes("pix") || texto.includes("cartão") || texto.includes("cartao") || texto.includes("dinheiro")) {
    return "pagamento";
  }

  if (texto.includes("desempenho") || texto.includes("resultado") || texto.includes("faturamento") || texto.includes("vendas") || texto.includes("ticket")) {
    return "desempenho";
  }

  if (texto.includes("oportunidade") || texto.includes("vender mais") || texto.includes("melhorar") || texto.includes("recomend") || texto.includes("fazer")) {
    return "oportunidade";
  }

  if (texto.includes("importante") || texto.includes("resumo") || texto.includes("relatório") || texto.includes("relatorio")) {
    return "resumo";
  }

  return "geral";
}

function analisarDesempenho() {
  const vendas = obterVendasTratadas();
  const resumo = getResumo(vendas);
  const produtoTop = resumo.produtos[0];
  const categoriaTop = resumo.categorias[0];
  const pagamentoTop = resumo.pagamentos[0];

  if (!vendas.length) {
    return `
      <p>Eu ainda não encontrei vendas no filtro atual. Para gerar uma análise melhor, registre vendas ou altere o período do relatório.</p>
    `;
  }

  return `
    <p>
      No período <strong>${getPeriodLabel()}</strong>, seu negócio faturou
      <strong>${formatMoney(resumo.total)}</strong>, com
      <strong>${resumo.quantidade}</strong> venda(s) e ticket médio de
      <strong>${formatMoney(resumo.ticket)}</strong>.
    </p>

    <p>
      O produto de maior destaque foi <strong>${produtoTop?.nome || "-"}</strong>,
      e a categoria com melhor resultado foi <strong>${categoriaTop?.nome || "-"}</strong>.
      A forma de pagamento mais forte foi <strong>${pagamentoTop?.nome || "-"}</strong>.
    </p>

    <p>
      Minha sugestão: acompanhe os produtos líderes e mantenha estoque disponível para não perder vendas nos itens com maior saída.
    </p>
  `;
}

function analisarProduto() {
  const resumo = getResumo(obterVendasTratadas());
  const produtoTop = resumo.produtos[0];

  if (!produtoTop) {
    return `<p>Não encontrei produtos vendidos no filtro atual.</p>`;
  }

  return `
    <p>
      O produto que mais vendeu foi <strong>${produtoTop.nome}</strong>,
      com <strong>${produtoTop.quantidade}</strong> unidade(s) vendidas e
      <strong>${formatMoney(produtoTop.valor)}</strong> em faturamento.
    </p>

    <p>
      Esse produto merece atenção especial. Vale destacar esse item em promoções,
      verificar se o estoque está saudável e observar se ele continua tendo boa saída nos próximos períodos.
    </p>
  `;
}

function analisarCategoria() {
  const resumo = getResumo(obterVendasTratadas());
  const categoriaTop = resumo.categorias[0];

  if (!categoriaTop) {
    return `<p>Não encontrei categorias com vendas no filtro atual.</p>`;
  }

  return `
    <p>
      A categoria com melhor faturamento foi <strong>${categoriaTop.nome}</strong>,
      somando <strong>${formatMoney(categoriaTop.valor)}</strong> e
      <strong>${categoriaTop.quantidade}</strong> unidade(s) vendidas.
    </p>

    <p>
      Essa categoria pode indicar uma preferência dos seus clientes. Minha sugestão é acompanhar quais produtos dela têm maior saída e priorizar reposição ou divulgação.
    </p>
  `;
}

function analisarPagamento() {
  const resumo = getResumo(obterVendasTratadas());
  const pagamentoTop = resumo.pagamentos[0];

  if (!pagamentoTop) {
    return `<p>Não encontrei formas de pagamento no filtro atual.</p>`;
  }

  const percentual = resumo.total > 0 ? ((pagamentoTop.valor / resumo.total) * 100).toFixed(1) : 0;

  return `
    <p>
      A forma de pagamento em destaque foi <strong>${pagamentoTop.nome}</strong>,
      representando <strong>${percentual}%</strong> do faturamento filtrado,
      com total de <strong>${formatMoney(pagamentoTop.valor)}</strong>.
    </p>

    <p>
      Isso ajuda você a entender o comportamento dos seus clientes e pode orientar decisões sobre promoções, taxas e organização financeira.
    </p>
  `;
}

function analisarEstoque() {
  const produtosBaixo = getProdutosBaixoEstoque();
  const produtosSemEstoque = getProdutosSemEstoque();

  if (!produtosBaixo.length && !produtosSemEstoque.length) {
    return `
      <p>
        No momento, não encontrei produtos abaixo do estoque mínimo. Seu estoque parece saudável com base nos dados cadastrados.
      </p>

      <p>
        Minha sugestão: continue mantendo o estoque mínimo atualizado para que a Fluxy consiga avisar quando algum item precisar de reposição.
      </p>
    `;
  }

  const urgente = produtosSemEstoque[0] || produtosBaixo[0];

  return `
    <p>
      Encontrei <strong>${produtosBaixo.length}</strong> produto(s) em estoque baixo
      e <strong>${produtosSemEstoque.length}</strong> produto(s) sem estoque.
    </p>

    <p>
      O item mais urgente para verificar é <strong>${urgente.name}</strong>,
      com <strong>${urgente.stock}</strong> unidade(s) disponíveis
      ${urgente.minStock ? `e estoque mínimo de <strong>${urgente.minStock}</strong>.` : "."}
    </p>

    <p>
      Minha recomendação: priorize a reposição dos itens zerados ou abaixo do mínimo, principalmente se eles também aparecem entre os produtos mais vendidos.
    </p>
  `;
}

function analisarOportunidade() {
  const vendas = obterVendasTratadas();
  const resumo = getResumo(vendas);
  const produtosBaixo = getProdutosBaixoEstoque();

  if (!vendas.length) {
    return `
      <p>
        Ainda não há vendas suficientes no filtro atual para identificar uma oportunidade clara.
      </p>

      <p>
        Comece registrando vendas com produto, quantidade e forma de pagamento para que eu consiga cruzar os dados.
      </p>
    `;
  }

  const produtoTop = resumo.produtos[0];
  const categoriaTop = resumo.categorias[0];

  const produtoTopNoEstoque = produtosGlobais.find((produto) => produto.name === produtoTop?.nome);
  const produtoTopBaixo = produtoTopNoEstoque && produtoTopNoEstoque.minStock && Number(produtoTopNoEstoque.stock) <= Number(produtoTopNoEstoque.minStock);

  if (produtoTopBaixo) {
    return `
      <p>
        Vejo uma oportunidade importante: <strong>${produtoTop.nome}</strong> é um dos produtos mais vendidos,
        mas está com estoque baixo.
      </p>

      <p>
        Minha recomendação é repor esse produto primeiro, porque ele já demonstrou saída no período analisado.
        Assim você reduz o risco de perder vendas.
      </p>
    `;
  }

  return `
    <p>
      A principal oportunidade está em reforçar a categoria <strong>${categoriaTop?.nome || "-"}</strong>,
      que teve o melhor faturamento no período.
    </p>

    <p>
      Também vale destacar o produto <strong>${produtoTop?.nome || "-"}</strong>, que liderou em quantidade vendida.
      Você pode usar esse item como chamariz em ofertas, kits ou campanhas.
    </p>
  `;
}

function gerarResumoGeral() {
  const vendas = obterVendasTratadas();
  const resumo = getResumo(vendas);

  if (!vendas.length) {
    return `
      <p>
        Eu ainda não encontrei vendas no filtro atual. Quando houver registros, consigo mostrar produtos, categorias, pagamentos e oportunidades.
      </p>
    `;
  }

  return `
    <p>
      O ponto mais importante do relatório é que o período <strong>${getPeriodLabel()}</strong>
      gerou <strong>${formatMoney(resumo.total)}</strong> em faturamento,
      com <strong>${resumo.quantidade}</strong> venda(s).
    </p>

    <p>
      Produto destaque: <strong>${resumo.produtos[0]?.nome || "-"}</strong>.<br>
      Categoria destaque: <strong>${resumo.categorias[0]?.nome || "-"}</strong>.<br>
      Pagamento destaque: <strong>${resumo.pagamentos[0]?.nome || "-"}</strong>.
    </p>

    <p>
      Minha sugestão é acompanhar esses três pontos juntos: produto, categoria e estoque. Eles mostram onde o negócio está performando melhor e onde pode haver oportunidade.
    </p>
  `;
}

function responderFluxter(pergunta) {
  const intencao = getIntencao(pergunta);

  if (intencao === "estoque") return analisarEstoque();
  if (intencao === "produto") return analisarProduto();
  if (intencao === "categoria") return analisarCategoria();
  if (intencao === "pagamento") return analisarPagamento();
  if (intencao === "desempenho") return analisarDesempenho();
  if (intencao === "oportunidade") return analisarOportunidade();
  if (intencao === "resumo") return gerarResumoGeral();

  return `
    <p>
      Posso te ajudar com desempenho, produto mais vendido, categoria destaque,
      forma de pagamento, estoque baixo e oportunidades de venda.
    </p>

    <p>
      Pelo filtro atual, o resumo geral é: ${gerarResumoGeral()}
    </p>
  `;
}

function gerarAnaliseFluxter() {
  aiAnalysisTime.textContent = formatDate(new Date());
  aiAnalysisContent.innerHTML = gerarResumoGeral();
}

function responderPerguntaFluxter() {
  const pergunta = aiQuestionInput.value.trim();

  if (!pergunta) return;

  const resposta = responderFluxter(pergunta);

  aiAnalysisContent.innerHTML += `
    <h4 class="info">Você perguntou:</h4>
    <p><strong>${pergunta}</strong></p>

    <h4 class="positive">Fluxter respondeu:</h4>
    ${resposta}
  `;

  aiAnalysisTime.textContent = formatDate(new Date());
  aiQuestionInput.value = "";

  aiAnalysisContent.scrollTop = aiAnalysisContent.scrollHeight;

  notifyToast(
    "success",
    "message-circle",
    "Fluxter respondeu",
    "A resposta foi gerada com base nos dados do relatório."
  );
}

function getExportRows() {
  return obterVendasTratadas().map((venda) => ({
    Produto: venda.produto || "-",
    Categoria: venda.categoria || "Sem categoria",
    Quantidade: venda.quantidade || 1,
    Pagamento: normalizePayment(venda.pagamento),
    "Valor total": Number(venda.valor || 0),
    Data: formatDate(venda.createdAt),
    Status: venda.status || "Concluída"
  }));
}

function getFileDate() {
  return new Date().toISOString().slice(0, 10);
}

function getResumoRows(resumo) {
  const user = getUser();

  return [
    ["Relatório Fluxy", ""],
    ["Negócio", user.businessName || "Fluxy"],
    ["Data de geração", formatDate(new Date())],
    ["Período", getPeriodLabel()],
    ["Categoria", filtroCategoriaInput.value],
    ["Pagamento", filtroPagamentoInput.value],
    ["Busca", buscarInput.value || "Não aplicada"],
    ["", ""],
    ["Total vendido", resumo.total],
    ["Quantidade de vendas", resumo.quantidade],
    ["Itens vendidos", resumo.itens],
    ["Ticket médio", resumo.ticket],
    ["Produto destaque", resumo.produtos[0]?.nome || "-"],
    ["Pagamento destaque", resumo.pagamentos[0]?.nome || "-"],
    ["Categoria destaque", resumo.categorias[0]?.nome || "-"]
  ];
}

function exportarExcel() {
  const rows = getExportRows();
  const resumo = getResumo(obterVendasTratadas());

  if (!rows.length) {
    notifyToast(
      "warning",
      "file-warning",
      "Nada para exportar",
      "Não há dados no filtro atual."
    );
    return;
  }

  const workbook = XLSX.utils.book_new();

  const resumoSheet = XLSX.utils.aoa_to_sheet(getResumoRows(resumo));
  resumoSheet["!cols"] = [{ wch: 28 }, { wch: 36 }];

  const vendasSheet = XLSX.utils.json_to_sheet(rows);
  vendasSheet["!cols"] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 }
  ];

  const categoriasRows = resumo.categorias.map((item) => ({
    Categoria: item.nome,
    Quantidade: item.quantidade,
    Faturamento: item.valor
  }));

  const pagamentosRows = resumo.pagamentos.map((item) => ({
    Pagamento: item.nome,
    Quantidade: item.quantidade,
    Faturamento: item.valor
  }));

  const categoriasSheet = XLSX.utils.json_to_sheet(categoriasRows);
  const pagamentosSheet = XLSX.utils.json_to_sheet(pagamentosRows);

  categoriasSheet["!cols"] = [{ wch: 26 }, { wch: 14 }, { wch: 18 }];
  pagamentosSheet["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(workbook, resumoSheet, "Resumo Fluxy");
  XLSX.utils.book_append_sheet(workbook, vendasSheet, "Vendas");
  XLSX.utils.book_append_sheet(workbook, categoriasSheet, "Categorias");
  XLSX.utils.book_append_sheet(workbook, pagamentosSheet, "Pagamentos");

  XLSX.writeFile(workbook, `relatorio-fluxy-${getFileDate()}.xlsx`);

  notifyToast(
    "success",
    "file-spreadsheet",
    "Excel Fluxy gerado",
    "O relatório foi exportado com abas organizadas."
  );
}

function exportarPDF() {
  const rows = getExportRows();
  const vendas = obterVendasTratadas();
  const resumo = getResumo(vendas);

  if (!rows.length) {
    notifyToast(
      "warning",
      "file-warning",
      "Nada para exportar",
      "Não há dados no filtro atual."
    );
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const user = getUser();
  const businessNameText = user.businessName || "Fluxy";

  doc.setFillColor(11, 18, 32);
  doc.rect(0, 0, 210, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Fluxy", 14, 15);

  doc.setFontSize(10);
  doc.text("O fluxo certo para o seu negócio", 14, 22);

  doc.setTextColor(226, 232, 240);
  doc.text(`Negócio: ${businessNameText}`, 130, 13);
  doc.text(`Gerado em: ${formatDate(new Date())}`, 130, 20);
  doc.text(`Período: ${getPeriodLabel()}`, 130, 27);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text("Relatório de Vendas", 14, 46);

  doc.setFontSize(10);
  doc.text(`Categoria: ${filtroCategoriaInput.value}`, 14, 54);
  doc.text(`Pagamento: ${filtroPagamentoInput.value}`, 70, 54);
  doc.text(`Busca: ${buscarInput.value || "Não aplicada"}`, 130, 54);

  doc.setFillColor(52, 152, 219);
  doc.roundedRect(14, 64, 42, 24, 3, 3, "F");

  doc.setFillColor(26, 188, 156);
  doc.roundedRect(61, 64, 42, 24, 3, 3, "F");

  doc.setFillColor(34, 197, 94);
  doc.roundedRect(108, 64, 42, 24, 3, 3, "F");

  doc.setFillColor(245, 158, 11);
  doc.roundedRect(155, 64, 42, 24, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Faturamento", 18, 72);
  doc.text("Vendas", 65, 72);
  doc.text("Itens vendidos", 112, 72);
  doc.text("Ticket médio", 159, 72);

  doc.setFontSize(11);
  doc.text(formatMoney(resumo.total), 18, 82);
  doc.text(String(resumo.quantidade), 65, 82);
  doc.text(String(resumo.itens), 112, 82);
  doc.text(formatMoney(resumo.ticket), 159, 82);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text("Insights principais", 14, 101);

  doc.setFontSize(9);

  const insights = [
    `Produto destaque: ${resumo.produtos[0]?.nome || "-"} (${resumo.produtos[0]?.quantidade || 0} un.)`,
    `Pagamento destaque: ${resumo.pagamentos[0]?.nome || "-"} (${formatMoney(resumo.pagamentos[0]?.valor || 0)})`,
    `Categoria destaque: ${resumo.categorias[0]?.nome || "-"} (${formatMoney(resumo.categorias[0]?.valor || 0)})`
  ];

  insights.forEach((item, index) => {
    doc.text(`• ${item}`, 14, 109 + index * 6);
  });

  doc.autoTable({
    startY: 132,
    head: [["Produto", "Categoria", "Qtd", "Pagamento", "Valor", "Data", "Status"]],
    body: rows.map((row) => [
      row.Produto,
      row.Categoria,
      row.Quantidade,
      row.Pagamento,
      formatMoney(row["Valor total"]),
      row.Data,
      row.Status
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: [52, 152, 219],
      textColor: [255, 255, 255]
    },
    alternateRowStyles: {
      fillColor: [245, 248, 252]
    },
    margin: {
      left: 14,
      right: 14
    }
  });

  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Fluxy — O fluxo certo para o seu negócio", 14, 287);
    doc.text(`Página ${i} de ${pageCount}`, 176, 287);
  }

  doc.save(`relatorio-fluxy-${getFileDate()}.pdf`);

  notifyToast(
    "success",
    "file-text",
    "PDF Fluxy gerado",
    "O relatório foi exportado com identidade visual da Fluxy."
  );
}

openFiltersBtn.addEventListener("click", () => {
  filtersPanel.hidden = !filtersPanel.hidden;
});

periodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    periodButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    periodoAtual = button.dataset.period;

    if (periodoAtual === "custom") {
      customDateBox.hidden = false;
      return;
    }

    customDateBox.hidden = true;
    dataInicialCustom = null;
    dataFinalCustom = null;
    dataInicialInput.value = "";
    dataFinalInput.value = "";

    renderizarRelatorio();
    gerarAnaliseFluxter();
  });
});

applyDateBtn.addEventListener("click", () => {
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

  renderizarRelatorio();
  gerarAnaliseFluxter();

  notifyToast(
    "success",
    "check",
    "Período aplicado",
    "O relatório foi atualizado com as datas escolhidas."
  );
});

buscarInput.addEventListener("input", () => {
  renderizarRelatorio();
  gerarAnaliseFluxter();
});

filtroCategoriaInput.addEventListener("change", () => {
  renderizarRelatorio();
  gerarAnaliseFluxter();
});

filtroPagamentoInput.addEventListener("change", () => {
  renderizarRelatorio();
  gerarAnaliseFluxter();
});

ordenarInput.addEventListener("change", () => {
  renderizarRelatorio();

  notifyToast(
    "info",
    "arrow-up-down",
    "Ordenação aplicada",
    "Os dados do relatório foram reorganizados."
  );
});

clearFiltersBtn.addEventListener("click", () => {
  periodoAtual = "all";
  dataInicialCustom = null;
  dataFinalCustom = null;

  buscarInput.value = "";
  filtroCategoriaInput.value = "todas";
  filtroPagamentoInput.value = "todos";
  ordenarInput.value = "recentes";
  dataInicialInput.value = "";
  dataFinalInput.value = "";
  customDateBox.hidden = true;

  periodButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.period === "all");
  });

  renderizarRelatorio();
  gerarAnaliseFluxter();

  notifyToast(
    "info",
    "rotate-ccw",
    "Filtros limpos",
    "O relatório voltou para a visualização completa."
  );
});

generateAiBtn.addEventListener("click", () => {
  gerarAnaliseFluxter();

  notifyToast(
    "success",
    "sparkles",
    "Análise gerada",
    "O Fluxter atualizou os insights do relatório."
  );
});

sendAiQuestionBtn.addEventListener("click", responderPerguntaFluxter);

aiQuestionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    responderPerguntaFluxter();
  }
});

suggestionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    aiQuestionInput.value = button.dataset.question;
    responderPerguntaFluxter();
  });
});

exportXlsxBtn.addEventListener("click", exportarExcel);
exportPdfBtn.addEventListener("click", exportarPDF);

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

aplicarTemaSalvo();
carregarDados();

if (window.lucide) {
  lucide.createIcons();
}