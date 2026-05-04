const API_URL = "http://localhost:3000";
const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const formProfile = document.getElementById("form-profile");
const formPassword = document.getElementById("form-password");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const businessNameInput = document.getElementById("businessName");
const businessTypeInput = document.getElementById("businessType");
const monthlyGoalInput = document.getElementById("monthlyGoal");

const profileFeedback = document.getElementById("profile-feedback");
const passwordFeedback = document.getElementById("password-feedback");
const themeBtn = document.getElementById("toggle-theme");

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function protegerPagina() {
  if (!getToken()) {
    window.location.href = "auth.html";
  }
}

function showFeedback(element, message, type = "success") {
  element.textContent = message;
  element.className = `feedback ${type}`;

  setTimeout(() => {
    element.textContent = "";
    element.className = "feedback";
  }, 2500);
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
}

async function carregarPerfil() {
  try {
    const response = await fetch(`${API_URL}/user/me`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    if (response.status === 401) {
      sair();
      return;
    }

    const user = await response.json();

    nameInput.value = user.name || "";
    emailInput.value = user.email || "";
    businessNameInput.value = user.businessName || "";
    businessTypeInput.value = user.businessType || "";
    monthlyGoalInput.value = user.monthlyGoal || "";

    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    showFeedback(profileFeedback, "Erro ao carregar perfil.", "error");
  }
}

formProfile.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch(`${API_URL}/user/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        name: nameInput.value,
        businessName: businessNameInput.value,
        businessType: businessTypeInput.value,
        monthlyGoal: monthlyGoalInput.value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      showFeedback(profileFeedback, result.error || "Erro ao salvar.", "error");
      return;
    }

    localStorage.setItem(USER_KEY, JSON.stringify(result));
    showFeedback(profileFeedback, "Perfil atualizado com sucesso!");
  } catch {
    showFeedback(profileFeedback, "Erro ao conectar com servidor.", "error");
  }
});

formPassword.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;

  if (newPassword.length < 6) {
    showFeedback(passwordFeedback, "A nova senha precisa ter no mínimo 6 caracteres.", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/user/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    const result = await response.json();

    if (!response.ok) {
      showFeedback(passwordFeedback, result.error || "Erro ao alterar senha.", "error");
      return;
    }

    formPassword.reset();
    showFeedback(passwordFeedback, "Senha alterada com sucesso!");
  } catch {
    showFeedback(passwordFeedback, "Erro ao conectar com servidor.", "error");
  }
});

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

protegerPagina();
aplicarTemaSalvo();
carregarPerfil();

themeBtn.addEventListener("click", alternarTema);

if (window.lucide) {
  lucide.createIcons();
}