const API_BASE = "https://fluxy-api-r0lt.onrender.com";

const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const NOTIFICATIONS_KEY = "fluxy_notifications_enabled";
const STOCK_ALERTS_KEY = "fluxy_stock_alerts_enabled";
const NOTIFICATION_CHANNEL_KEY = "fluxy_notification_channel";
const NOTIFICATION_FREQUENCY_KEY = "fluxy_notification_frequency";
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
const canalNotificacaoInput = document.getElementById("canal-notificacao");
const frequenciaNotificacaoInput = document.getElementById("frequencia-notificacao");
const salvarPreferenciasBtn = document.getElementById("salvar-preferencias");

const aceiteTermosInput = document.getElementById("aceite-termos");
const permissaoRelatoriosInput = document.getElementById("permissao-relatorios");
const permissaoIaInput = document.getElementById("permissao-ia");
const permissaoFluxterLocalInput = document.getElementById("permissao-fluxter-local");
const permissaoIaExternaInput = document.getElementById("permissao-ia-externa");
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

  if (!terms) {
    return {
      acceptedTerms: false,
      allowReports: false,
      allowFluxterLocal: false,
      allowExternalAI: false,
      allowSmartNotifications: false
    };
  }

  const parsedTerms = JSON.parse(terms);

  return {
    acceptedTerms: Boolean(parsedTerms.acceptedTerms),
    allowReports: Boolean(parsedTerms.allowReports),
    allowFluxterLocal: Boolean(parsedTerms.allowFluxterLocal ?? parsedTerms.allowAI),
    allowExternalAI: Boolean(parsedTerms.allowExternalAI),
    allowSmartNotifications: Boolean(parsedTerms.allowSmartNotifications)
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

  if (themeDarkBtn) {
    themeDarkBtn.classList.toggle("active", theme === "dark");
  }

  if (themeLightBtn) {
    themeLightBtn.classList.toggle("active", theme === "light");
  }

  localStorage.setItem(THEME_KEY, theme);
}

function renderBusinessLogo(url) {
  if (!businessLogoImg || !businessLogoPlaceholder) return;

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
  const safeUser = user || {};

  if (nomeUsuarioInput) {
    nomeUsuarioInput.value = safeUser.name || "";
  }

  if (emailUsuarioInput) {
    emailUsuarioInput.value = safeUser.email || "";
  }

  if (nomeNegocioInput) {
    nomeNegocioInput.value = safeUser.businessName || "";
  }

  if (tipoNegocioInput) {
    tipoNegocioInput.value = safeUser.businessType || "";
  }

  if (metaMensalInput) {
    metaMensalInput.value = safeUser.monthlyGoal || "";
  }

  if (telefoneNegocioInput) {
    telefoneNegocioInput.value = safeUser.phone || "";
  }

  if (securityEmail) {
    securityEmail.textContent = safeUser.email || "Email não identificado";
  }

  renderBusinessLogo(safeUser.businessLogoUrl);
}

async function carregarDados() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  const notificationsEnabled = localStorage.getItem(NOTIFICATIONS_KEY);
  const stockAlertsEnabled = localStorage.getItem(STOCK_ALERTS_KEY);
  const notificationChannel = localStorage.getItem(NOTIFICATION_CHANNEL_KEY) || "system";
  const notificationFrequency = localStorage.getItem(NOTIFICATION_FREQUENCY_KEY) || "event";
  const terms = getTerms();

  if (notificacoesVisuaisInput) {
    notificacoesVisuaisInput.checked =
      notificationsEnabled === null ? true : notificationsEnabled === "true";
  }

  if (alertasEstoqueInput) {
    alertasEstoqueInput.checked =
      stockAlertsEnabled === null ? true : stockAlertsEnabled === "true";
  }

  if (canalNotificacaoInput) {
    canalNotificacaoInput.value = notificationChannel;
  }

  if (frequenciaNotificacaoInput) {
    frequenciaNotificacaoInput.value = notificationFrequency;
  }

  if (aceiteTermosInput) {
    aceiteTermosInput.checked = terms.acceptedTerms;
  }

  if (permissaoRelatoriosInput) {
    permissaoRelatoriosInput.checked = terms.allowReports;
  }

  if (permissaoIaInput) {
    permissaoIaInput.checked = terms.allowFluxterLocal;
  }

  if (permissaoFluxterLocalInput) {
    permissaoFluxterLocalInput.checked = terms.allowFluxterLocal;
  }

  if (permissaoIaExternaInput) {
    permissaoIaExternaInput.checked = terms.allowExternalAI;
  }

  if (permissaoNotificacoesInput) {
    permissaoNotificacoesInput.checked = terms.allowSmartNotifications;
  }

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

if (logoNegocioInput) {
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
}

if (removerLogoNegocioBtn) {
  removerLogoNegocioBtn.addEventListener("click", () => {
    selectedLogoBase64 = null;
    removeBusinessLogo = true;

    if (logoNegocioInput) {
      logoNegocioInput.value = "";
    }

    renderBusinessLogo(null);

    notifyToast(
      "info",
      "trash-2",
      "Logo removida",
      "Salve o perfil para confirmar a remoção."
    );
  });
}

if (formPerfil) {
  formPerfil.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: nomeUsuarioInput?.value.trim() || "",
      businessName: nomeNegocioInput?.value.trim() || "",
      businessType: tipoNegocioInput?.value.trim() || "",
      monthlyGoal: metaMensalInput?.value ? Number(metaMensalInput.value) : null,
      phone: telefoneNegocioInput?.value.trim() || "",
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
}

if (themeDarkBtn) {
  themeDarkBtn.addEventListener("click", () => {
    aplicarTema("dark");

    notifyToast(
      "success",
      "moon",
      "Tema escuro ativado",
      "A preferência foi salva para as próximas páginas."
    );
  });
}

if (themeLightBtn) {
  themeLightBtn.addEventListener("click", () => {
    aplicarTema("light");

    notifyToast(
      "success",
      "sun",
      "Tema claro ativado",
      "A preferência foi salva para as próximas páginas."
    );
  });
}

if (salvarPreferenciasBtn) {
  salvarPreferenciasBtn.addEventListener("click", () => {
    localStorage.setItem(
      NOTIFICATIONS_KEY,
      String(notificacoesVisuaisInput ? notificacoesVisuaisInput.checked : true)
    );

    localStorage.setItem(
      STOCK_ALERTS_KEY,
      String(alertasEstoqueInput ? alertasEstoqueInput.checked : true)
    );

    localStorage.setItem(
      NOTIFICATION_CHANNEL_KEY,
      canalNotificacaoInput ? canalNotificacaoInput.value : "system"
    );

    localStorage.setItem(
      NOTIFICATION_FREQUENCY_KEY,
      frequenciaNotificacaoInput ? frequenciaNotificacaoInput.value : "event"
    );

    notifyToast(
      "success",
      "save",
      "Preferências salvas",
      "As preferências de aparência e alertas foram atualizadas."
    );
  });
}

if (salvarPermissoesBtn) {
  salvarPermissoesBtn.addEventListener("click", () => {
    const allowFluxterLocal =
      permissaoFluxterLocalInput?.checked ??
      permissaoIaInput?.checked ??
      false;

    const terms = {
      acceptedTerms: aceiteTermosInput ? aceiteTermosInput.checked : false,
      allowReports: permissaoRelatoriosInput ? permissaoRelatoriosInput.checked : false,
      allowFluxterLocal,
      allowAI: allowFluxterLocal,
      allowExternalAI: permissaoIaExternaInput ? permissaoIaExternaInput.checked : false,
      allowSmartNotifications: permissaoNotificacoesInput
        ? permissaoNotificacoesInput.checked
        : false
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
}

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

if (logoutSettingsBtn) {
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
}

carregarDados();

if (window.lucide) {
  lucide.createIcons();
}