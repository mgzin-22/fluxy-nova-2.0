function showToast({
  type = "info",
  title = "Notificação",
  message = "",
  icon = "bell",
  duration = 4200
}) {
  let toastContainer = document.getElementById("toast-container");

  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = "fluxy-toast";

  toast.innerHTML = `
    <div class="toast-left">
      <span class="toast-icon ${type}">
        <i data-lucide="${icon}"></i>
      </span>

      <div class="toast-text">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    </div>

    <button class="toast-close" type="button" aria-label="Fechar alerta">
      <i data-lucide="x"></i>
    </button>
  `;

  toastContainer.appendChild(toast);

  if (window.lucide) {
    lucide.createIcons();
  }

  const closeToast = () => {
    toast.classList.add("hide");

    setTimeout(() => {
      toast.remove();
    }, 280);
  };

  const closeButton = toast.querySelector(".toast-close");

  if (closeButton) {
    closeButton.addEventListener("click", closeToast);
  }

  setTimeout(closeToast, duration);
}

function showSuccessToast(title, message) {
  showToast({
    type: "success",
    icon: "check",
    title,
    message
  });
}

function showErrorToast(title, message) {
  showToast({
    type: "danger",
    icon: "circle-alert",
    title,
    message
  });
}

function showWarningToast(title, message) {
  showToast({
    type: "warning",
    icon: "triangle-alert",
    title,
    message
  });
}

function showInfoToast(title, message) {
  showToast({
    type: "info",
    icon: "info",
    title,
    message
  });
}

window.showToast = showToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;