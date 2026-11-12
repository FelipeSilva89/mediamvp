/**
 * MediaMVP - Admin Dashboard
 * Reads analytics saved by the player in this browser origin.
 */

(function () {
    "use strict";

    const STORAGE_KEY = "mediamvp_analytics";
    const REFRESH_INTERVAL = 5000;
    const elements = {
        status: document.getElementById("storage-status"),
        period: document.getElementById("period-filter"),
        refresh: document.getElementById("refresh-btn"),
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
        sessionsTable: document.getElementById("sessions-table")
    };

    function emptyAnalytics() {
        return {
            sessions: [],
            events: [],
            advertisements: {}
        };
    }

    function getAnalytics() {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (!rawData) {
            return emptyAnalytics();
        }

        const parsed = JSON.parse(rawData);
        return {
            sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
            events: Array.isArray(parsed.events) ? parsed.events : [],
            advertisements:
                parsed.advertisements && typeof parsed.advertisements === "object"
                    ? parsed.advertisements
                    : {}
        };
    }

    function getRange(period) {
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        if (period === "all") {
            return { start: null, end };
        }

        const days = period === "today" ? 1 : period === "2d" ? 2 : period === "30d" ? 30 : 7;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - days + 1);
        return { start, end };
    }

    function isInRange(value, range) {
        if (!value) {
            return false;
        }
        const date = new Date(value);
        return !Number.isNaN(date.getTime()) &&
            (!range.start || date >= range.start) &&
            date <= range.end;
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("pt-BR").format(value || 0);
    }

    function formatDuration(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        if (hours) {
            return `${hours}h ${minutes}min`;
        }
        if (minutes) {
            return `${minutes}min`;
        }
        return `${total}s`;
    }

    function formatDate(value) {
        if (!value) {
            return "Em andamento";
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "Data inválida"
            : date.toLocaleString("pt-BR");
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function renderChart(sessions, period) {
        const count = period === "today" ? 1 : period === "2d" ? 2 : 7;
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let offset = count - 1; offset >= 0; offset--) {
            const date = new Date(today);
            date.setDate(today.getDate() - offset);
            days.push(date);
        }

        const values = days.map((date) => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            return sessions.reduce((total, session) => {
                if (!isInRange(session.start || session.startedAt, { start: date, end: nextDay })) {
                    return total;
                }
                return total + (Number(session.duration) || 0);
            }, 0);
        });
        const max = Math.max(...values, 1);

        elements.chart.innerHTML = days.map((date, index) => {
            const label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            const height = values[index] ? Math.max(3, values[index] / max * 100) : 1;
            return `
                <div class="chart-day">
                    <div class="chart-bar" style="height:${height}%" data-value="${escapeHtml(formatDuration(values[index]))}"></div>
                    <span class="chart-label">${label}</span>
                </div>
            `;
        }).join("");
    }

    function renderRanking(events, advertisements) {
        const totals = new Map();
        events.filter((event) => event.type === "advertisement_impression").forEach((event) => {
            const id = event.advertisementId || event.advertisementName || "anuncio";
            const current = totals.get(id) || {
                name: event.advertisementName || advertisements[id]?.name || id,
                impressions: 0
            };
            current.impressions++;
            totals.set(id, current);
        });

        const rows = [...totals.values()].sort((a, b) => b.impressions - a.impressions);
        const max = Math.max(...rows.map((row) => row.impressions), 1);
        elements.ranking.innerHTML = rows.length
            ? rows.map((row) => `
                <div class="rank-row">
                    <div class="rank-info">
                        <div class="rank-name">${escapeHtml(row.name)}</div>
                        <div class="rank-meta">${formatNumber(row.impressions)} impressões</div>
                        <div class="rank-track"><div class="rank-fill" style="width:${row.impressions / max * 100}%"></div></div>
                    </div>
                    <span class="rank-count">${formatNumber(row.impressions)}</span>
                </div>
            `).join("")
            : '<p class="empty">Nenhuma impressão de anúncio neste período.</p>';
    }

    function renderEvents(events) {
        const recent = events.slice().sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        ).slice(0, 10);
        const names = {
            session_start: "Sessão iniciada",
            session_pause: "Sessão pausada",
            session_resume: "Sessão retomada",
            session_end: "Sessão encerrada",
            slide_view: "Slide exibido",
            advertisement_impression: "Anúncio exibido"
        };
        elements.events.innerHTML = recent.length
            ? recent.map((event) => {
                const detail = event.advertisementName || event.slideName || event.reason || "";
                return `<div class="event">
                    <span class="event-time">${escapeHtml(new Date(event.timestamp).toLocaleTimeString("pt-BR"))}</span>
                    <span class="event-type">${escapeHtml(names[event.type] || event.type)}</span>
                    <span class="event-detail">${escapeHtml(detail)}</span>
                </div>`;
            }).join("")
            : '<p class="empty">Nenhuma atividade registrada neste período.</p>';
    }

    function renderAdsTable(events, advertisements) {
        const totals = new Map();
        events.filter((event) => event.type === "advertisement_impression").forEach((event) => {
            const id = event.advertisementId || event.advertisementName || "anuncio";
            const row = totals.get(id) || {
                name: event.advertisementName || advertisements[id]?.name || id,
                impressions: 0,
                lastDisplay: event.timestamp
            };
            row.impressions++;
            if (new Date(event.timestamp) > new Date(row.lastDisplay)) {
                row.lastDisplay = event.timestamp;
            }
            totals.set(id, row);
        });

        const rows = [...totals.entries()].sort((a, b) => b[1].impressions - a[1].impressions);
        elements.adsTable.innerHTML = rows.length
            ? `<table class="data-table"><thead><tr><th>Anúncio</th><th>Impressões</th><th>Última exibição</th></tr></thead><tbody>
                ${rows.map(([, row]) => `<tr><td><strong>${escapeHtml(row.name)}</strong></td><td>${formatNumber(row.impressions)}</td><td>${escapeHtml(formatDate(row.lastDisplay))}</td></tr>`).join("")}
            </tbody></table>`
            : '<p class="empty">Nenhuma exibição de anúncio neste período.</p>';
    }

    function renderSessionsTable(sessions, events) {
        const rows = sessions.slice().sort((a, b) =>
            new Date(b.start || b.startedAt) - new Date(a.start || a.startedAt)
        );
        elements.sessionsTable.innerHTML = rows.length
            ? `<table class="data-table"><thead><tr><th>Início</th><th>Fim</th><th>Duração</th><th>Slides</th><th>Dispositivo</th></tr></thead><tbody>
                ${rows.map((session) => {
                    const sessionEvents = events.filter((event) =>
                        event.sessionId === session.id && event.type === "slide_view"
                    ).length;
                    return `<tr>
                        <td>${escapeHtml(formatDate(session.start || session.startedAt))}</td>
                        <td>${escapeHtml(formatDate(session.end || session.endedAt))}</td>
                        <td>${escapeHtml(formatDuration(session.duration))}</td>
                        <td>${formatNumber(session.slides || sessionEvents)}</td>
                        <td>${escapeHtml(session.device || "Navegador")}</td>
                    </tr>`;
                }).join("")}
            </tbody></table>`
            : '<p class="empty">Nenhuma sessão registrada neste período.</p>';
    }

    function refreshDashboard() {
        try {
            const analytics = getAnalytics();
            const period = elements.period.value;
            const range = getRange(period);
            const sessions = analytics.sessions.filter((session) =>
                isInRange(session.start || session.startedAt, range)
            );
            const events = analytics.events.filter((event) => isInRange(event.timestamp, range));
            const slideViews = events.filter((event) => event.type === "slide_view").length;
            const impressions = events.filter((event) =>
                event.type === "advertisement_impression"
            ).length;
            const activeTime = sessions.reduce((total, session) =>
                total + (Number(session.duration) || 0), 0
            );
            const adCount = new Set(events
                .filter((event) => event.type === "advertisement_impression")
                .map((event) => event.advertisementId || event.advertisementName)
            ).size;

            elements.active.textContent = formatDuration(activeTime);
            elements.activeDetail.textContent = `${formatNumber(sessions.length)} sessões no período`;
            elements.sessions.textContent = formatNumber(sessions.length);
            elements.slides.textContent = formatNumber(slideViews);
            elements.impressions.textContent = formatNumber(impressions);
            elements.adsDetail.textContent = `${formatNumber(adCount)} anúncios monitorados`;

            renderChart(sessions, period);
            renderRanking(events, analytics.advertisements);
            renderEvents(events);
            renderAdsTable(events, analytics.advertisements);
            renderSessionsTable(sessions, analytics.events);

            elements.status.textContent = localStorage.getItem(STORAGE_KEY)
                ? `${formatNumber(analytics.events.length)} eventos neste navegador`
                : "Sem dados neste navegador";
        } catch (error) {
            console.error("Erro ao atualizar o painel administrativo:", error);
            elements.status.textContent = "Erro ao ler dados locais";
            elements.events.innerHTML =
                '<p class="empty">Não foi possível ler os dados. Consulte o console do navegador.</p>';
        }
    }

    function setupNavigation() {
        document.querySelectorAll(".nav-item").forEach((button) => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".nav-item").forEach((item) =>
                    item.classList.toggle("active", item === button)
                );
                document.querySelectorAll(".section").forEach((section) =>
                    section.classList.toggle("active", section.id === button.dataset.section)
                );
                document.getElementById("page-title").textContent =
                    button.textContent.trim();
            });
        });
    }

    elements.period.addEventListener("change", refreshDashboard);
    elements.refresh.addEventListener("click", refreshDashboard);
    setupNavigation();
    refreshDashboard();
    window.setInterval(refreshDashboard, REFRESH_INTERVAL);
})();
