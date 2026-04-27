const STORAGE_USERS_KEY = "fluxy_users";
const STORAGE_SESSION_KEY = "fluxy_session";

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

function readUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || "[]");
}

function writeUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

function setSession(email) {
  localStorage.setItem(STORAGE_SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

function getSession() {
  return localStorage.getItem(STORAGE_SESSION_KEY);
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
  tabLogin.classList.toggle("is-active", isLogin);
  tabRegister.classList.toggle("is-active", !isLogin);
  tabLogin.setAttribute("aria-selected", String(isLogin));
  tabRegister.setAttribute("aria-selected", String(!isLogin));

  panelLogin.classList.toggle("is-active", isLogin);
  panelRegister.classList.toggle("is-active", !isLogin);
  panelLogin.hidden = !isLogin;
  panelRegister.hidden = isLogin;
  clearMessage();
}

function refreshSessionUI() {
  if (!sessionBox || !sessionText) return;

  const email = getSession();

  if (!email) {
    sessionBox.hidden = true;
    sessionText.textContent = "";
    return;
  }

  sessionText.textContent = `Logado como: ${email}`;
  sessionBox.hidden = false;
}

function validateRegisterData({ name, email, password, confirmPassword }) {
  if (name.trim().length < 2) {
    return "Informe um nome válido com pelo menos 2 caracteres.";
  }

  if (!email.includes("@")) {
    return "Informe um e-mail válido.";
  }

  if (password.length < 6) {
    return "A senha deve ter no mínimo 6 caracteres.";
  }

  if (password !== confirmPassword) {
    return "As senhas não conferem.";
  }

  return null;
}

if (isAuthPage) {
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(registerForm));
    const error = validateRegisterData(data);

    if (error) {
      showMessage(error, "error");
      return;
    }

    const users = readUsers();
    const userExists = users.some((user) => user.email.toLowerCase() === data.email.toLowerCase());

    if (userExists) {
      showMessage("Este e-mail já está cadastrado.", "error");
      return;
    }

    users.push({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password
    });

    writeUsers(users);
    setSession(data.email.trim().toLowerCase());
    registerForm.reset();
    refreshSessionUI();
    showMessage("Conta criada com sucesso! Você já está logado.", "success");
    setActiveTab("login");
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(loginForm));
    const users = readUsers();
    const user = users.find((item) => item.email === data.email.trim().toLowerCase());

    if (!user || user.password !== data.password) {
      showMessage("E-mail ou senha inválidos.", "error");
      return;
    }

    setSession(user.email);
    refreshSessionUI();
    showMessage(`Bem-vindo(a), ${user.name}!`, "success");
    loginForm.reset();
  });

  logoutBtn.addEventListener("click", () => {
    clearSession();
    refreshSessionUI();
    showMessage("Sessão encerrada com sucesso.", "success");
  });

  tabLogin.addEventListener("click", () => setActiveTab("login"));
  tabRegister.addEventListener("click", () => setActiveTab("register"));

  refreshSessionUI();
  setActiveTab("login");
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

if (!isAuthPage) {
  initHomeEffects();
}
