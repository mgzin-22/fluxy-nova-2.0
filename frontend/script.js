const API_URL = "http://localhost:3000";

const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";

if (window.lucide && typeof window.lucide.createIcons === "function") {
  window.lucide.createIcons();
}

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const panelLogin = document.getElementById("panel-login");
const panelRegister = document.getElementById("panel-register");
const loginForm = document.getElementById("panel-login");
const registerForm = document.getElementById("panel-register");
const messageBox = document.getElementById("auth-message");
const sessionBox = document.getElementById("session-box");
const sessionText = document.getElementById("session-text");
const logoutBtn = document.getElementById("logout-btn");

const isAuthPage = Boolean(tabLogin && tabRegister && loginForm && registerForm);
const isDashboardPage = window.location.pathname.includes("dashboard.html");

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

if (isDashboardPage && !getToken()) {
  window.location.href = "auth.html";
}

function showMessage(text, type = "success") {
  if (!messageBox) return;
  messageBox.hidden = false;
  messageBox.className = `message ${type}`;
  messageBox.textContent = text;
}

function clearMessage() {
  if (!messageBox) return;
  messageBox.hidden = true;
  messageBox.className = "message";
  messageBox.textContent = "";
}

function setActiveTab(mode) {
  if (!isAuthPage) return;

  const isLogin = mode === "login";

  document
    .getElementById("forms-wrapper")
    ?.classList.toggle("show-register", mode === "register");

  tabLogin.classList.toggle("is-active", isLogin);
  tabRegister.classList.toggle("is-active", !isLogin);

  panelLogin.classList.toggle("is-active", isLogin);
  panelRegister.classList.toggle("is-active", !isLogin);

  panelLogin.hidden = false;
  panelRegister.hidden = false;

  clearMessage();
}

function validateRegisterData({ name, email, password, confirmPassword }) {
  if (name.trim().length < 2) return "Informe um nome válido.";
  if (!email.includes("@")) return "Informe um e-mail válido.";
  if (password.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
  if (password !== confirmPassword) return "As senhas não conferem.";
  return null;
}

if (isAuthPage) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(registerForm));
    const error = validateRegisterData(data);

    if (error) {
      showMessage(error, "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Erro ao criar conta.", "error");
        return;
      }

      showMessage("Conta criada com sucesso! Faça login.", "success");
      registerForm.reset();
      setTimeout(() => setActiveTab("login"), 700);
    } catch {
      showMessage("Erro ao conectar com o servidor.", "error");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(loginForm));

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "E-mail ou senha inválidos.", "error");
        return;
      }

      saveAuth(result.token, result.user);
      showMessage("Login realizado! Redirecionando...", "success");

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 700);
    } catch {
      showMessage("Erro ao conectar com o servidor.", "error");
    }
  });

  tabLogin.addEventListener("click", () => setActiveTab("login"));
  tabRegister.addEventListener("click", () => setActiveTab("register"));
  setActiveTab("login");
}

function sair() {
  clearAuth();
  window.location.href = "auth.html";
}

function initHomeEffects() {
  const splash = document.getElementById("splash");

  if (splash) {
    window.setTimeout(() => {
      splash.classList.add("hidden");
    }, 900);
  }

  const revealItems = document.querySelectorAll(".reveal");

  if (!revealItems.length || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("active"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

if (!isAuthPage && !isDashboardPage) {
  initHomeEffects();
}

async function criarVenda() {
  const produtoInput = document.getElementById("produto");
  const valorInput = document.getElementById("valor");
  const pagamentoInput = document.getElementById("pagamento");

  if (!produtoInput || !valorInput || !pagamentoInput) return;

  const venda = {
    produto: produtoInput.value,
    valor: parseFloat(valorInput.value),
    pagamento: pagamentoInput.value
  };

  const response = await fetch(`${API_URL}/vendas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(venda)
  });

  const data = await response.json();
  console.log("Venda criada:", data);

  produtoInput.value = "";
  valorInput.value = "";
  pagamentoInput.value = "pix";
}

document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector("i");

    if (!input || !icon) return;

    const showing = input.type === "text";
    input.type = showing ? "password" : "text";

    icon.classList.toggle("fa-eye", showing);
    icon.classList.toggle("fa-eye-slash", !showing);
  });
});