const API = "https://fluxy-api-r0lt.onrender.com/products";
const TOKEN_KEY = "fluxy_token";
const USER_KEY = "fluxy_user";
const THEME_KEY = "fluxy_theme";

const token = localStorage.getItem(TOKEN_KEY);

const lista = document.getElementById("lista-produtos");
const formProduto = document.getElementById("form-produto");
const themeBtn = document.getElementById("toggle-theme");

const nomeInput = document.getElementById("nome");
const precoInput = document.getElementById("preco");
const estoqueInput = document.getElementById("estoque");
const minimoInput = document.getElementById("minimo");

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
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function carregarProdutos() {
  const res = await fetch(API, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    sair();
    return;
  }

  const produtos = await res.json();

  lista.innerHTML = "";

  if (!produtos.length) {
    lista.innerHTML = `<p class="empty">Nenhum produto cadastrado ainda.</p>`;
    return;
  }

  produtos.forEach((p) => {
    const el = document.createElement("div");

    el.className = "produto";

    if (p.minStock && p.stock <= p.minStock) {
      el.classList.add("low-stock");
    }

    el.innerHTML = `
      <div>
        <strong>${p.name}</strong>
        <small>${formatMoney(p.price)}</small>
      </div>

      <div>
        <span>Estoque: ${p.stock}</span>
      </div>
    `;

    lista.appendChild(el);
  });
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {
    name: nomeInput.value,
    price: precoInput.value,
    stock: estoqueInput.value,
    minStock: minimoInput.value
  };

  await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  formProduto.reset();
  carregarProdutos();
});

function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "auth.html";
}

aplicarTemaSalvo();
carregarProdutos();

if (themeBtn) {
  themeBtn.addEventListener("click", alternarTema);
}

if (window.lucide) {
  lucide.createIcons();
}