(function () {
  "use strict";

  const API_URL = "https://billowing-thunder-176amediamvp.drigo-felipe.workers.dev";
  const SESSION_KEY = "mediamvp_admin_session";
  const form = document.getElementById("login-form");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const button = document.getElementById("login-button");
  const error = document.getElementById("login-error");

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    let data = null;
    try { data = await response.json(); } catch (_) {}

    if (!response.ok) {
      throw new Error(data?.error || "Não foi possível concluir a operação.");
    }

    return data;
  }

  async function checkExistingSession() {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) return;

    try {
      await request("/admin/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.replace("admin.html");
    } catch (_) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;

    const user = username.value.trim();
    const pass = password.value;

    if (!user || !pass) {
      showError("Informe usuário e senha.");
      return;
    }

    button.disabled = true;
    button.textContent = "Entrando...";

    try {
      const result = await request("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: user, password: pass })
      });

      if (!result.token) {
        throw new Error("Resposta de autenticação inválida.");
      }

      sessionStorage.setItem(SESSION_KEY, result.token);
      window.location.replace("admin.html");
    } catch (err) {
      showError(err.message || "Usuário ou senha inválidos.");
    } finally {
      button.disabled = false;
      button.textContent = "Entrar";
    }
  });

  checkExistingSession();
})();
