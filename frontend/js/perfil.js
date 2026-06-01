const API_BASE = "https://fluxy-api-r0lt.onrender.com";

const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const NOTIFICATIONS_KEY = "fluxy_notifications_enabled";
const STOCK_ALERTS_KEY = "fluxy_stock_alerts_enabled";
const TERMS_KEY = "fluxy_terms_permissions";

const token = localStorage.getItem(TOKEN_KEY);

const tabs = document.querySelectorAll(".settings-tab");
const panels = document.querySelectorAll(".settings-panel");

const formPerfil = document.getElementById("form-perfil");

const nomeUsuarioInput = document.getElementById("nome-usuario");
const emailUsuarioInput = document.getElementById("email-usuario");
const nomeNegocioInput = document.getElementById("nome-negocio");
const tipoNegocioInput = document.getElementById("tipo-negocio");
const metaMensalInput = document.getElementById("meta-mensal");
const telefoneNegocioInput = document.getElementById("telefone-negocio");

const logoNegocioInput = document.getElementById("logo-negocio");
const removerLogoNegocioBtn = document.getElementById("remover-logo-negocio");
const businessLogoImg = document.getElementById("business-logo-img");
const businessLogoPlaceholder = document.getElementById("business-logo-placeholder");

const themeDarkBtn = document.getElementById("theme-dark");
const themeLightBtn = document.getElementById("theme-light");

const notificacoesVisuaisInput = document.getElementById("notificacoes-visuais");
const alertasEstoqueInput = document.getElementById("alertas-estoque");
const salvarPreferenciasBtn = document.getElementById("salvar-preferencias");

const aceiteTermosInput = document.getElementById("aceite-termos");
const permissaoRelatoriosInput = document.getElementById("permissao-relatorios");
const permissaoIaInput = document.getElementById("permissao-ia");
const permissaoNotificacoesInput = document.getElementById("permissao-notificacoes");
const salvarPermissoesBtn = document.getElementById("salvar-permissoes");

const securityEmail = document.getElementById("security-email");
const logoutSettingsBtn = document.getElementById("logout-settings-btn");

let selectedLogoBase64 = null;
let removeBusinessLogo = false;

if (!token) {
  window.location.href = "auth.html";
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : {};
}

function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getTerms() {
  const terms = localStorage.getItem(TERMS_KEY);

  return terms
    ? JSON.parse(terms)
    : {
        acceptedTerms: false,
        allowReports: false,
        allowAI: false,
        allowSmartNotifications: false
      };
}

function saveTerms(terms) {
  localStorage.setItem(TERMS_KEY, JSON.stringify(terms));
}

function notifyToast(type, icon, title, message) {
  const notificationsEnabled = localStorage.getItem(NOTIFICATIONS_KEY);

  if (notificationsEnabled === "false") return;

  if (typeof showToast === "function") {
    showToast({
      type,
      icon,
      title,
      message
    });
  }
}

function aplicarTema(theme) {
  document.body.classList.toggle("light", theme === "light");

  themeDarkBtn.classList.toggle("active", theme === "dark");
  themeLightBtn.classList.toggle("active", theme === "light");

  localStorage.setItem(THEME_KEY, theme);
}

function renderBusinessLogo(url) {
  if (url) {
    businessLogoImg.src = url;
    businessLogoImg.hidden = false;
    businessLogoPlaceholder.hidden = true;
    return;
  }

  businessLogoImg.src = "";
  businessLogoImg.hidden = true;
  businessLogoPlaceholder.hidden = false;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

async function carregarUsuarioApi() {
  const response = await fetch(`${API_BASE}/user/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível carregar o perfil.");
  }

  saveUser(data);
  return data;
}

function preencherPerfil(user) {
  nomeUsuarioInput.value = user.name || "";
  emailUsuarioInput.value = user.email || "";
  nomeNegocioInput.value = user.businessName || "";
  tipoNegocioInput.value = user.businessType || "";
  metaMensalInput.value = user.monthlyGoal || "";
  telefoneNegocioInput.value = user.phone || "";

  securityEmail.textContent = user.email || "Email não identificado";

  renderBusinessLogo(user.businessLogoUrl);
}

async function carregarDados() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  const notificationsEnabled = localStorage.getItem(NOTIFICATIONS_KEY);
  const stockAlertsEnabled = localStorage.getItem(STOCK_ALERTS_KEY);
  const terms = getTerms();

  notificacoesVisuaisInput.checked =
    notificationsEnabled === null ? true : notificationsEnabled === "true";

  alertasEstoqueInput.checked =
    stockAlertsEnabled === null ? true : stockAlertsEnabled === "true";

  aceiteTermosInput.checked = terms.acceptedTerms;
  permissaoRelatoriosInput.checked = terms.allowReports;
  permissaoIaInput.checked = terms.allowAI;
  permissaoNotificacoesInput.checked = terms.allowSmartNotifications;

  aplicarTema(savedTheme);

  try {
    const user = await carregarUsuarioApi();
    preencherPerfil(user);
  } catch (error) {
    const user = getUser();
    preencherPerfil(user);

    notifyToast(
      "warning",
      "wifi-off",
      "Perfil local carregado",
      "Não foi possível buscar os dados atualizados no servidor."
    );
  }
}

function trocarAba(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    trocarAba(tab.dataset.tab);
  });
});

logoNegocioInput.addEventListener("change", async () => {
  const file = logoNegocioInput.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    notifyToast(
      "warning",
      "image-off",
      "Arquivo inválido",
      "Escolha uma imagem nos formatos PNG, JPG ou WEBP."
    );
    logoNegocioInput.value = "";
    return;
  }

  const maxSizeMB = 3;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    notifyToast(
      "warning",
      "file-warning",
      "Imagem muito grande",
      `Escolha uma imagem com até ${maxSizeMB}MB.`
    );
    logoNegocioInput.value = "";
    return;
  }

  try {
    selectedLogoBase64 = await fileToBase64(file);
    removeBusinessLogo = false;
    renderBusinessLogo(selectedLogoBase64);

    notifyToast(
      "success",
      "image",
      "Logo selecionada",
      "Agora salve o perfil para confirmar a alteração."
    );
  } catch (error) {
    notifyToast(
      "danger",
      "circle-alert",
      "Erro na imagem",
      error.message
    );
  }
});

removerLogoNegocioBtn.addEventListener("click", () => {
  selectedLogoBase64 = null;
  removeBusinessLogo = true;
  logoNegocioInput.value = "";

  renderBusinessLogo(null);

  notifyToast(
    "info",
    "trash-2",
    "Logo removida",
    "Salve o perfil para confirmar a remoção."
  );
});

formPerfil.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: nomeUsuarioInput.value.trim(),
    businessName: nomeNegocioInput.value.trim(),
    businessType: tipoNegocioInput.value.trim(),
    monthlyGoal: metaMensalInput.value ? Number(metaMensalInput.value) : null,
    phone: telefoneNegocioInput.value.trim(),
    businessLogoBase64: selectedLogoBase64,
    removeBusinessLogo
  };

  try {
    const response = await fetch(`${API_BASE}/user/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      notifyToast(
        "danger",
        "circle-alert",
        "Erro ao salvar perfil",
        data.error || "Não foi possível atualizar as informações."
      );
      return;
    }

    selectedLogoBase64 = null;
    removeBusinessLogo = false;

    saveUser(data);
    preencherPerfil(data);

    notifyToast(
      "success",
      "check",
      "Perfil salvo",
      "As informações do negócio foram atualizadas."
    );
  } catch (error) {
    notifyToast(
      "danger",
      "wifi-off",
      "Erro de conexão",
      "Não foi possível conectar com o servidor."
    );
  }
});

themeDarkBtn.addEventListener("click", () => {
  aplicarTema("dark");

  notifyToast(
    "success",
    "moon",
    "Tema escuro ativado",
    "A preferência foi salva para as próximas páginas."
  );
});

themeLightBtn.addEventListener("click", () => {
  aplicarTema("light");

  notifyToast(
    "success",
    "sun",
    "Tema claro ativado",
    "A preferência foi salva para as próximas páginas."
  );
});

salvarPreferenciasBtn.addEventListener("click", () => {
  localStorage.setItem(NOTIFICATIONS_KEY, String(notificacoesVisuaisInput.checked));
  localStorage.setItem(STOCK_ALERTS_KEY, String(alertasEstoqueInput.checked));

  if (notificacoesVisuaisInput.checked) {
    notifyToast(
      "success",
      "save",
      "Preferências salvas",
      "As preferências de aparência e alertas foram atualizadas."
    );
  }
});

salvarPermissoesBtn.addEventListener("click", () => {
  const terms = {
    acceptedTerms: aceiteTermosInput.checked,
    allowReports: permissaoRelatoriosInput.checked,
    allowAI: permissaoIaInput.checked,
    allowSmartNotifications: permissaoNotificacoesInput.checked
  };

  saveTerms(terms);

  if (!terms.acceptedTerms) {
    notifyToast(
      "warning",
      "triangle-alert",
      "Termos não aceitos",
      "Você ainda não marcou o aceite dos termos de uso."
    );
    return;
  }

  notifyToast(
    "success",
    "shield-check",
    "Permissões salvas",
    "As permissões do sistema foram atualizadas."
  );
});

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

logoutSettingsBtn.addEventListener("click", () => {
  notifyToast(
    "info",
    "log-out",
    "Saindo da conta",
    "Você será redirecionado para o login."
  );

  setTimeout(() => {
    sair();
  }, 800);
});

carregarDados();

if (window.lucide) {
  lucide.createIcons();
}