const API_BASE = "https://fluxy-api-r0lt.onrender.com";
const VENDAS_API = `${API_BASE}/vendas`;

const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const token = localStorage.getItem(TOKEN_KEY);

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

const totalVendidoEl = document.getElementById("total-vendido");
const qtdVendasEl = document.getElementById("qtd-vendas");
const itensVendidosEl = document.getElementById("itens-vendidos");
const ticketMedioEl = document.getElementById("ticket-medio");
const periodLabelEl = document.getElementById("period-label");

const produtoDestaqueEl = document.getElementById("produto-destaque");
const pagamentoDestaqueEl = document.getElementById("pagamento-destaque");
const categoriaDestaqueEl = document.getElementById("categoria-destaque");
const reportSummaryEl = document.getElementById("report-summary");
const generatedAtEl = document.getElementById("generated-at");
const tableCountEl = document.getElementById("table-count");
const listaRelatorio = document.getElementById("lista-relatorio");

let vendasGlobais = [];
let periodoAtual = "all";
let dataInicialCustom = null;
let dataFinalCustom = null;

if (!token) {
  window.location.href = "auth.html";
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

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : {};
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

function getPeriodLabel() {
  const labels = {
    all: "Todo o histórico",
    today: "Hoje",
    week: "Últimos 7 dias",
    month: "Mês atual",
    custom: "Período personalizado"
  };

  return labels[periodoAtual] || "Filtro atual";
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
      vendasGlobais = [];
      renderizarRelatorio();

      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao carregar relatório",
        data.error || "Não foi possível carregar as vendas."
      );
      return;
    }

    vendasGlobais = Array.isArray(data) ? data : [];

    atualizarCategorias();
    renderizarRelatorio();

    notifyToast(
      "success",
      "file-text",
      "Relatório carregado",
      "Os dados foram atualizados com sucesso."
    );
  } catch (error) {
    console.error(error);
    vendasGlobais = [];
    renderizarRelatorio();

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

  if (ordenacao === "recentes") {
    return vendasOrdenadas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
  return ordenarRelatorio(filtrarRelatorio());
}

function agruparPorCampo(vendas, campo) {
  return vendas.reduce((acc, venda) => {
    const key = campo(venda) || "Não informado";

    if (!acc[key]) {
      acc[key] = {
        nome: key,
        quantidade: 0,
        valor: 0
      };
    }

    acc[key].quantidade += Number(venda.quantidade || 1);
    acc[key].valor += Number(venda.valor || 0);

    return acc;
  }, {});
}

function getMaiorPorValor(obj) {
  return Object.values(obj).sort((a, b) => b.valor - a.valor)[0];
}

function getMaiorPorQuantidade(obj) {
  return Object.values(obj).sort((a, b) => b.quantidade - a.quantidade)[0];
}

function renderizarRelatorio() {
  const vendas = obterVendasTratadas();

  renderizarCards(vendas);
  renderizarDestaques(vendas);
  renderizarTabela(vendas);
  renderizarResumo(vendas);

  generatedAtEl.textContent = `Gerado em ${formatDate(new Date())}`;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderizarCards(vendas) {
  const total = vendas.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
  const quantidadeVendas = vendas.length;
  const itens = vendas.reduce((sum, venda) => sum + Number(venda.quantidade || 1), 0);
  const ticketMedio = quantidadeVendas > 0 ? total / quantidadeVendas : 0;

  totalVendidoEl.textContent = formatMoney(total);
  qtdVendasEl.textContent = quantidadeVendas;
  itensVendidosEl.textContent = itens;
  ticketMedioEl.textContent = formatMoney(ticketMedio);
  periodLabelEl.textContent = getPeriodLabel();
}

function renderizarDestaques(vendas) {
  if (!vendas.length) {
    produtoDestaqueEl.textContent = "Nenhum produto encontrado.";
    pagamentoDestaqueEl.textContent = "Nenhum pagamento encontrado.";
    categoriaDestaqueEl.textContent = "Nenhuma categoria encontrada.";
    return;
  }

  const produtos = agruparPorCampo(vendas, (venda) => venda.produto);
  const pagamentos = agruparPorCampo(vendas, (venda) => normalizePayment(venda.pagamento));
  const categorias = agruparPorCampo(vendas, (venda) => venda.categoria || venda.product?.category || "Sem categoria");

  const produtoTop = getMaiorPorQuantidade(produtos);
  const pagamentoTop = getMaiorPorValor(pagamentos);
  const categoriaTop = getMaiorPorValor(categorias);

  produtoDestaqueEl.innerHTML = `
    <strong>${produtoTop.nome}</strong>
    <small>${produtoTop.quantidade} unidade(s) vendidas • ${formatMoney(produtoTop.valor)}</small>
  `;

  pagamentoDestaqueEl.innerHTML = `
    <strong>${pagamentoTop.nome}</strong>
    <small>${formatMoney(pagamentoTop.valor)} em vendas</small>
  `;

  categoriaDestaqueEl.innerHTML = `
    <strong>${categoriaTop.nome}</strong>
    <small>${formatMoney(categoriaTop.valor)} em vendas • ${categoriaTop.quantidade} unidade(s)</small>
  `;
}

function renderizarResumo(vendas) {
  const total = vendas.reduce((sum, venda) => sum + Number(venda.valor || 0), 0);
  const periodo = getPeriodLabel();

  if (!vendas.length) {
    reportSummaryEl.textContent = `Nenhuma venda encontrada para o filtro: ${periodo}.`;
    return;
  }

  reportSummaryEl.textContent =
    `Foram encontradas ${vendas.length} venda(s), somando ${formatMoney(total)}, no filtro: ${periodo}.`;
}

function renderizarTabela(vendas) {
  listaRelatorio.innerHTML = "";

  tableCountEl.textContent =
    vendas.length === 0
      ? "Nenhuma venda encontrada"
      : `${vendas.length} venda(s) encontradas no relatório`;

  if (!vendas.length) {
    listaRelatorio.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Nenhuma venda encontrada.</td>
      </tr>
    `;
    return;
  }

  vendas.forEach((venda) => {
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

function exportarExcel() {
  const rows = getExportRows();

  if (!rows.length) {
    notifyToast(
      "warning",
      "file-warning",
      "Nada para exportar",
      "Não há dados no filtro atual."
    );
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório de Vendas");

  XLSX.writeFile(workbook, `relatorio-fluxy-${getFileDate()}.xlsx`);

  notifyToast(
    "success",
    "file-spreadsheet",
    "Excel gerado",
    "O relatório foi exportado em formato XLSX."
  );
}

function exportarPDF() {
  const rows = getExportRows();

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
  const doc = new jsPDF();

  const user = getUser();
  const businessName = user.businessName || "Fluxy";

  doc.setFontSize(16);
  doc.text("Relatório de Vendas - Fluxy", 14, 18);

  doc.setFontSize(10);
  doc.text(`Negócio: ${businessName}`, 14, 26);
  doc.text(`Gerado em: ${formatDate(new Date())}`, 14, 32);
  doc.text(`Período: ${getPeriodLabel()}`, 14, 38);
  doc.text(`Categoria: ${filtroCategoriaInput.value}`, 14, 44);
  doc.text(`Pagamento: ${filtroPagamentoInput.value}`, 14, 50);

  const total = rows.reduce((sum, row) => sum + Number(row["Valor total"] || 0), 0);

  doc.text(`Total vendido: ${formatMoney(total)}`, 14, 58);
  doc.text(`Quantidade de vendas: ${rows.length}`, 14, 64);

  doc.autoTable({
    startY: 72,
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
      fontSize: 8
    },
    headStyles: {
      fillColor: [52, 152, 219]
    }
  });

  doc.save(`relatorio-fluxy-${getFileDate()}.pdf`);

  notifyToast(
    "success",
    "file-text",
    "PDF gerado",
    "O relatório foi exportado em formato PDF."
  );
}

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

  notifyToast(
    "success",
    "check",
    "Período aplicado",
    "O relatório foi atualizado com as datas escolhidas."
  );
});

buscarInput.addEventListener("input", renderizarRelatorio);
filtroCategoriaInput.addEventListener("change", renderizarRelatorio);
filtroPagamentoInput.addEventListener("change", renderizarRelatorio);
ordenarInput.addEventListener("change", renderizarRelatorio);

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

  notifyToast(
    "info",
    "rotate-ccw",
    "Filtros limpos",
    "O relatório voltou para a visualização completa."
  );
});

exportXlsxBtn.addEventListener("click", exportarExcel);
exportPdfBtn.addEventListener("click", exportarPDF);

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

aplicarTemaSalvo();
carregarVendas();

if (window.lucide) {
  lucide.createIcons();
}