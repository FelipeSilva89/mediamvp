/**
 * MediaMVP - Admin Dashboard v0.2
 * Fonte principal: Cloudflare Worker /analytics/report
 * Autenticação: sessão emitida pelo Worker.
 */
(function () {
  "use strict";

  const API_URL = "https://billowing-thunder-176amediamvp.drigo-felipe.workers.dev";
  const SESSION_KEY = "mediamvp_admin_session";
  const REFRESH_INTERVAL = 60000;

  const elements = {
    status: document.getElementById("storage-status"),
    period: document.getElementById("period-filter"),
    refresh: document.getElementById("refresh-btn"),
    logout: document.getElementById("logout-btn"),
    active: document.getElementById("metric-active"),
    activeDetail: document.getElementById("metric-active-detail"),
    sessions: document.getElementById("metric-sessions"),
    slides: document.getElementById("metric-slides"),
    impressions: document.getElementById("metric-impressions"),
    adsDetail: document.getElementById("metric-ads-detail"),
    chart: document.getElementById("usage-chart"),
    ranking: document.getElementById("ad-ranking"),
    events: document.getElementById("recent-events"),
    adsTable: document.getElementById("ads-table"),
    sessionsTable: document.getElementById("sessions-table"),
    devicesTable: document.getElementById("devices-table"),
    footer: document.getElementById("footer-status")
  };

  let reportCache = null;

  function token() {
    return sessionStorage.getItem(SESSION_KEY);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours) return `${hours}h ${minutes}min`;
    if (minutes) return `${minutes}min`;
    return `${total}s`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Data inválida" : date.toLocaleString("pt-BR");
  }

  function isoWeek(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function isoYear(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    return d.getUTCFullYear();
  }

  function populatePeriods() {
    const currentYear = isoYear();
    const currentWeek = isoWeek();
    const options = [];
    for (let offset = 0; offset < 12; offset++) {
      const date = new Date();
      date.setDate(date.getDate() - offset * 7);
      const year = isoYear(date);
      const week = isoWeek(date);
      const value = `${year}-W${String(week).padStart(2, "0")}`;
      options.push(`<option value="${value}">${year} — Semana ${week}${offset === 0 && year === currentYear && week === currentWeek ? " (atual)" : ""}</option>`);
    }
    elements.period.innerHTML = options.join("");
  }

  function selectedWeek() {
    const [year, week] = elements.period.value.split("-W");
    return { year: Number(year), week: Number(week) };
  }

  async function api(path, options = {}) {
    const currentToken = token();
    if (!currentToken) {
      window.location.replace("admin-login.html");
      throw new Error("Sessão não encontrada.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${currentToken}`,
        ...(options.headers || {})
      }
    });

    let data = null;
    try { data = await response.json(); } catch (_) {}

    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace("admin-login.html");
      throw new Error("Sessão expirada.");
    }

    if (!response.ok) {
      throw new Error(data?.error || "Falha na comunicação com o servidor.");
    }

    return data;
  }

  function normalizeReport(data) {
    return {
      period: data.period || {},
      summary: data.summary || {},
      devices: Array.isArray(data.devices) ? data.devices : []
    };
  }

  function renderChart(devices) {
    // O endpoint atual é agregado por dispositivo, não por dia.
    // O gráfico preserva o componente existente, agora mostrando uso por dispositivo.
    const rows = devices.slice().sort((a, b) => (Number(b.sessions) || 0) - (Number(a.sessions) || 0)).slice(0, 7);
    const values = rows.map((row) => Number(row.adDurationSeconds) || Number(row.activeSeconds) || 0);
    const max = Math.max(...values, 1);

    elements.chart.innerHTML = rows.length ? rows.map((row, index) => {
      const value = values[index];
      const height = value ? Math.max(3, value / max * 100) : 1;
      const label = row.name || row.deviceId || `Dispositivo ${index + 1}`;
      return `<div class="chart-day">
        <div class="chart-bar" style="height:${height}%" data-value="${escapeHtml(formatDuration(value))}"></div>
        <span class="chart-label">${escapeHtml(label.slice(0, 12))}</span>
      </div>`;
    }).join("") : '<p class="empty">Nenhum dispositivo com atividade no período.</p>';
  }

  function renderRanking(devices) {
    const rows = devices.slice().sort((a, b) => (Number(b.adImpressions) || 0) - (Number(a.adImpressions) || 0));
    const total = rows.reduce((sum, row) => sum + (Number(row.adImpressions) || 0), 0);
    const max = Math.max(...rows.map((row) => Number(row.adImpressions) || 0), 1);

    elements.ranking.innerHTML = total
      ? rows.map((row) => {
        const count = Number(row.adImpressions) || 0;
        if (!count) return "";
        return `<div class="rank-row"><div class="rank-info">
          <div class="rank-name">${escapeHtml(row.name || row.deviceId)}</div>
          <div class="rank-meta">${formatNumber(count)} impressões</div>
          <div class="rank-track"><div class="rank-fill" style="width:${count / max * 100}%"></div></div>
        </div><span class="rank-count">${formatNumber(count)}</span></div>`;
      }).join("") || '<p class="empty">Nenhuma impressão de anúncio no período.</p>'
      : '<p class="empty">Nenhuma impressão de anúncio no período.</p>';
  }

  function renderEvents(devices, period) {
    const events = devices
      .filter((row) => row.lastHeartbeat)
      .sort((a, b) => new Date(b.lastHeartbeat) - new Date(a.lastHeartbeat))
      .slice(0, 10);

    elements.events.innerHTML = events.length
      ? events.map((row) => `<div class="event">
          <span class="event-time">${escapeHtml(formatDate(row.lastHeartbeat))}</span>
          <span class="event-type">Heartbeat</span>
          <span class="event-detail">${escapeHtml(row.name || row.deviceId)} — ${formatNumber(row.heartbeats)} contatos registrados na semana ${escapeHtml(String(period.week || ""))}</span>
        </div>`).join("")
      : '<p class="empty">Nenhuma atividade de dispositivo registrada no período.</p>';
  }

  function renderAdsTable(devices) {
    const rows = devices
      .map((row) => ({
        device: row.name || row.deviceId,
        impressions: Number(row.adImpressions) || 0,
        duration: Number(row.adDurationSeconds) || 0
      }))
      .filter((row) => row.impressions > 0 || row.duration > 0)
      .sort((a, b) => b.impressions - a.impressions);

    elements.adsTable.innerHTML = rows.length
      ? `<table class="data-table"><thead><tr><th>Dispositivo</th><th>Impressões</th><th>Tempo de publicidade</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${escapeHtml(row.device)}</strong></td><td>${formatNumber(row.impressions)}</td><td>${escapeHtml(formatDuration(row.duration))}</td></tr>`).join("")}</tbody></table>`
      : '<p class="empty">Nenhuma exibição de anúncio no período.</p>';
  }

  function renderSessionsTable(devices) {
    const rows = devices.slice().sort((a, b) => (Number(b.sessions) || 0) - (Number(a.sessions) || 0));
    elements.sessionsTable.innerHTML = rows.length
      ? `<table class="data-table"><thead><tr><th>Dispositivo</th><th>Sessões</th><th>Tempo ativo</th><th>Impressões</th><th>Último heartbeat</th></tr></thead><tbody>${rows.map((row) => `<tr>
          <td><strong>${escapeHtml(row.name || row.deviceId)}</strong></td>
          <td>${formatNumber(row.sessions)}</td>
          <td>${escapeHtml(formatDuration(row.activeSeconds || row.adDurationSeconds || 0))}</td>
          <td>${formatNumber(row.adImpressions)}</td>
          <td>${escapeHtml(formatDate(row.lastHeartbeat))}</td>
        </tr>`).join("")}</tbody></table>`
      : '<p class="empty">Nenhum dispositivo com sessão no período.</p>';
  }

  function renderDevicesTable(devices) {
    elements.devicesTable.innerHTML = devices.length
      ? `<table class="data-table"><thead><tr><th>Dispositivo</th><th>Tipo</th><th>Localização</th><th>Último contato</th><th>Status</th></tr></thead><tbody>${devices.map((row) => {
          const last = row.lastHeartbeat ? new Date(row.lastHeartbeat) : null;
          const online = last && !Number.isNaN(last.getTime()) && (Date.now() - last.getTime()) <= 30 * 60 * 1000;
          return `<tr><td><strong>${escapeHtml(row.name || row.deviceId)}</strong></td><td>${escapeHtml(row.type || "tablet")}</td><td>${escapeHtml(row.location || "—")}</td><td>${escapeHtml(formatDate(row.lastHeartbeat))}</td><td><span class="badge ${online ? "" : "offline"}">${online ? "Online" : "Offline"}</span></td></tr>`;
        }).join("")}</tbody></table>`
      : '<p class="empty">Nenhum dispositivo cadastrado.</p>';
  }

  function refreshCards(report) {
    const summary = report.summary;
    const sessions = Number(summary.sessions) || 0;
    const impressions = Number(summary.adImpressions) || 0;
    const activeSeconds = Number(summary.activeSeconds) || 0;
    const slides = Number(summary.slides) || 0;
    const ads = Number(summary.advertisers || summary.adCount) || new Set(report.devices.filter((d) => Number(d.adImpressions) > 0).map((d) => d.deviceId)).size;

    elements.active.textContent = formatDuration(activeSeconds);
    elements.activeDetail.textContent = `${formatNumber(sessions)} sessões no período`;
    elements.sessions.textContent = formatNumber(sessions);
    elements.slides.textContent = formatNumber(slides);
    elements.impressions.textContent = formatNumber(impressions);
    elements.adsDetail.textContent = `${formatNumber(ads)} dispositivos com anúncios`;
  }

  async function refreshDashboard() {
    try {
      const { year, week } = selectedWeek();
      const report = normalizeReport(await api(`/analytics/report?year=${encodeURIComponent(year)}&week=${encodeURIComponent(week)}`));
      reportCache = report;
      refreshCards(report);
      renderChart(report.devices);
      renderRanking(report.devices);
      renderEvents(report.devices, report.period);
      renderAdsTable(report.devices);
      renderSessionsTable(report.devices);
      renderDevicesTable(report.devices);

      const generatedAt = report.generatedAt || new Date().toISOString();
      elements.status.textContent = `● Servidor conectado • ${formatDate(generatedAt)}`;
      elements.footer.textContent = `v0.2 • relatório ${year}-W${String(week).padStart(2, "0")}`;
    } catch (error) {
      console.error("Erro ao atualizar o painel administrativo:", error);
      elements.status.textContent = "● Falha na conexão com o servidor";
      elements.events.innerHTML = `<p class="empty">${escapeHtml(error.message || "Não foi possível carregar o relatório.")}</p>`;
    }
  }

  async function logout() {
    const currentToken = token();
    try {
      if (currentToken) {
        await fetch(`${API_URL}/admin/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` }
        });
      }
    } catch (_) {
      // Mesmo com falha de rede, remove a sessão local.
    } finally {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace("admin-login.html");
    }
  }

  function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
        document.querySelectorAll(".section").forEach((section) => section.classList.toggle("active", section.id === button.dataset.section));
        document.getElementById("page-title").textContent = button.textContent.trim();
      });
    });
  }

  async function init() {
    if (!token()) {
      window.location.replace("admin-login.html");
      return;
    }

    populatePeriods();
    elements.period.addEventListener("change", refreshDashboard);
    elements.refresh.addEventListener("click", refreshDashboard);
    elements.logout.addEventListener("click", logout);
    setupNavigation();
    await refreshDashboard();
    window.setInterval(refreshDashboard, REFRESH_INTERVAL);
  }

  init();
})();
