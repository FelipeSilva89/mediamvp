/**
 * MediaMVP - Admin Dashboard
 * Versão: 1.0
 *
 * Dashboard administrativo local.
 * Não faz chamadas para Cloudflare, Meteoblue ou APIs externas.
 *
 * Estrutura esperada no localStorage:
 *   mediamvp_analytics
 *
 * Exemplo:
 * {
 *   totalActiveTime: 1234,
 *   sessions: [...],
 *   slides: [...],
 *   advertisements: {
 *      "ad-1": {
 *          impressions: 10,
 *          displayTime: 100
 *      }
 *   },
 *   lastActivity: "2026-11-11T12:00:00.000Z"
 * }
 */

(function () {
    "use strict";

    // =========================================================
    // CONFIGURAÇÃO
    // =========================================================

    const STORAGE_KEY = "mediamvp_analytics";

    const REFRESH_INTERVAL = 5000;

    // =========================================================
    // ELEMENTOS
    // =========================================================

    const elements = {
        totalActiveTime: document.getElementById("totalActiveTime"),
        totalSessions: document.getElementById("totalSessions"),
        totalSlides: document.getElementById("totalSlides"),
        lastActivity: document.getElementById("lastActivity"),

        activeTimeDetail: document.getElementById("activeTimeDetail"),
        sessionDetail: document.getElementById("sessionDetail"),
        slideDetail: document.getElementById("slideDetail"),

        advertisementsTable: document.getElementById("advertisementsTable"),
        sessionsTable: document.getElementById("sessionsTable"),

        refreshButton: document.getElementById("refreshButton"),
        clearButton: document.getElementById("clearButton"),
        exportButton: document.getElementById("exportButton")
    };

    // =========================================================
    // UTILITÁRIOS
    // =========================================================

    function getAnalytics() {
        try {
            const rawData = localStorage.getItem(STORAGE_KEY);

            if (!rawData) {
                return createEmptyAnalytics();
            }

            const data = JSON.parse(rawData);

            return normalizeAnalytics(data);

        } catch (error) {
            console.error("Erro ao carregar analytics:", error);

            return createEmptyAnalytics();
        }
    }

    function createEmptyAnalytics() {
        return {
            totalActiveTime: 0,
            sessions: [],
            slides: [],
            advertisements: {},
            lastActivity: null
        };
    }

    function normalizeAnalytics(data) {
        return {
            totalActiveTime: Number(data.totalActiveTime) || 0,

            sessions: Array.isArray(data.sessions)
                ? data.sessions
                : [],

            slides: Array.isArray(data.slides)
                ? data.slides
                : [],

            advertisements:
                data.advertisements &&
                typeof data.advertisements === "object"
                    ? data.advertisements
                    : {},

            lastActivity: data.lastActivity || null
        };
    }

    // =========================================================
    // FORMATAÇÃO
    // =========================================================

    function formatDuration(seconds) {
        seconds = Math.max(0, Number(seconds) || 0);

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }

        if (minutes > 0) {
            return `${minutes}min ${secs}s`;
        }

        return `${secs}s`;
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "Nunca";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Data inválida";
        }

        return date.toLocaleString("pt-BR");
    }

    function formatNumber(number) {
        return new Intl.NumberFormat("pt-BR").format(
            Number(number) || 0
        );
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // =========================================================
    // CÁLCULOS
    // =========================================================

    function calculateTotalSlideViews(analytics) {
        return analytics.slides.reduce(function (total, slide) {
            return total + (Number(slide.views) || 0);
        }, 0);
    }

    function calculateTotalAdImpressions(analytics) {
        return Object.values(analytics.advertisements).reduce(
            function (total, ad) {
                return total + (Number(ad.impressions) || 0);
            },
            0
        );
    }

    function calculateTotalAdDisplayTime(analytics) {
        return Object.values(analytics.advertisements).reduce(
            function (total, ad) {
                return total + (Number(ad.displayTime) || 0);
            },
            0
        );
    }

    // =========================================================
    // RENDERIZAÇÃO DO RESUMO
    // =========================================================

    function renderSummary(analytics) {

        const totalSlideViews =
            calculateTotalSlideViews(analytics);

        const totalAdImpressions =
            calculateTotalAdImpressions(analytics);

        if (elements.totalActiveTime) {
            elements.totalActiveTime.textContent =
                formatDuration(analytics.totalActiveTime);
        }

        if (elements.totalSessions) {
            elements.totalSessions.textContent =
                formatNumber(analytics.sessions.length);
        }

        if (elements.totalSlides) {
            elements.totalSlides.textContent =
                formatNumber(totalSlideViews);
        }

        if (elements.lastActivity) {
            elements.lastActivity.textContent =
                formatDate(analytics.lastActivity);
        }

        if (elements.activeTimeDetail) {
            elements.activeTimeDetail.textContent =
                formatDuration(analytics.totalActiveTime);
        }

        if (elements.sessionDetail) {
            elements.sessionDetail.textContent =
                `${formatNumber(analytics.sessions.length)} sessões`;
        }

        if (elements.slideDetail) {
            elements.slideDetail.textContent =
                `${formatNumber(totalSlideViews)} exibições`;
        }

        const totalAdElement =
            document.getElementById("totalAdImpressions");

        if (totalAdElement) {
            totalAdElement.textContent =
                formatNumber(totalAdImpressions);
        }

        const totalAdTimeElement =
            document.getElementById("totalAdDisplayTime");

        if (totalAdTimeElement) {
            totalAdTimeElement.textContent =
                formatDuration(calculateTotalAdDisplayTime(analytics));
        }
    }

    // =========================================================
    // TABELA DE ANÚNCIOS
    // =========================================================

    function renderAdvertisements(analytics) {

        if (!elements.advertisementsTable) {
            return;
        }

        const advertisements =
            analytics.advertisements;

        const entries =
            Object.entries(advertisements);

        if (entries.length === 0) {

            elements.advertisementsTable.innerHTML = `
                <tr>
                    <td colspan="5">
                        Nenhum dado de publicidade disponível.
                    </td>
                </tr>
            `;

            return;
        }

        entries.sort(function (a, b) {
            const impressionsA =
                Number(a[1].impressions) || 0;

            const impressionsB =
                Number(b[1].impressions) || 0;

            return impressionsB - impressionsA;
        });

        elements.advertisementsTable.innerHTML =
            entries.map(function ([id, ad]) {

                const impressions =
                    Number(ad.impressions) || 0;

                const displayTime =
                    Number(ad.displayTime) || 0;

                const lastDisplay =
                    ad.lastDisplay || null;

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    ad.name || id
                                )}
                            </strong>
                        </td>

                        <td>
                            ${formatNumber(impressions)}
                        </td>

                        <td>
                            ${formatDuration(displayTime)}
                        </td>

                        <td>
                            ${formatDate(lastDisplay)}
                        </td>

                        <td>
                            ${escapeHtml(
                                ad.image || ""
                            )}
                        </td>

                    </tr>
                `;

            }).join("");
    }

    // =========================================================
    // TABELA DE SESSÕES
    // =========================================================

    function renderSessions(analytics) {

        if (!elements.sessionsTable) {
            return;
        }

        const sessions =
            analytics.sessions.slice().reverse();

        if (sessions.length === 0) {

            elements.sessionsTable.innerHTML = `
                <tr>
                    <td colspan="5">
                        Nenhuma sessão registrada.
                    </td>
                </tr>
            `;

            return;
        }

        elements.sessionsTable.innerHTML =
            sessions.map(function (session) {

                const start =
                    session.start ||
                    session.startedAt ||
                    null;

                const end =
                    session.end ||
                    session.endedAt ||
                    null;

                let duration =
                    Number(session.duration) || 0;

                /*
                 * Caso a sessão não tenha duração salva,
                 * tenta calcular pelo início/fim.
                 */

                if (
                    duration === 0 &&
                    start &&
                    end
                ) {
                    const startDate =
                        new Date(start);

                    const endDate =
                        new Date(end);

                    if (
                        !Number.isNaN(
                            startDate.getTime()
                        ) &&
                        !Number.isNaN(
                            endDate.getTime()
                        )
                    ) {
                        duration =
                            (
                                endDate.getTime() -
                                startDate.getTime()
                            ) / 1000;
                    }
                }

                const slides =
                    Number(session.slides) || 0;

                return `
                    <tr>

                        <td>
                            ${formatDate(start)}
                        </td>

                        <td>
                            ${formatDate(end)}
                        </td>

                        <td>
                            ${formatDuration(duration)}
                        </td>

                        <td>
                            ${formatNumber(slides)}
                        </td>

                        <td>
                            ${escapeHtml(
                                session.device ||
                                "Tablet"
                            )}
                        </td>

                    </tr>
                `;

            }).join("");
    }

    // =========================================================
    // ATUALIZAÇÃO DO DASHBOARD
    // =========================================================

    function refreshDashboard() {

        const analytics =
            getAnalytics();

        renderSummary(analytics);

        renderAdvertisements(analytics);

        renderSessions(analytics);

        updateStatus();

        console.log(
            "[MediaMVP Admin] Dashboard atualizado."
        );
    }

    // =========================================================
    // STATUS
    // =========================================================

    function updateStatus() {

        const statusElement =
            document.getElementById("dashboardStatus");

        if (!statusElement) {
            return;
        }

        statusElement.textContent =
            "Dados locais atualizados";

        statusElement.classList.add("active");

        setTimeout(function () {

            statusElement.classList.remove("active");

        }, 1000);
    }

    // =========================================================
    // EXPORTAÇÃO
    // =========================================================

    function exportAnalytics() {

        const analytics =
            getAnalytics();

        const data =
            JSON.stringify(
                analytics,
                null,
                2
            );

        const blob =
            new Blob(
                [data],
                {
                    type: "application/json"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `mediamvp-analytics-${formatFileDate()}.json`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    function formatFileDate() {

        const now =
            new Date();

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                now.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // =========================================================
    // LIMPAR DADOS
    // =========================================================

    function clearAnalytics() {

        const confirmed =
            window.confirm(
                "Tem certeza que deseja apagar todos os dados de analytics deste dispositivo?"
            );

        if (!confirmed) {
            return;
        }

        localStorage.removeItem(
            STORAGE_KEY
        );

        refreshDashboard();

        alert(
            "Dados de analytics removidos."
        );
    }

    // =========================================================
    // EVENTOS
    // =========================================================

    function setupEvents() {

        if (elements.refreshButton) {

            elements.refreshButton.addEventListener(
                "click",
                function () {

                    refreshDashboard();

                }
            );
        }

        if (elements.clearButton) {

            elements.clearButton.addEventListener(
                "click",
                function () {

                    clearAnalytics();

                }
            );
        }

        if (elements.exportButton) {

            elements.exportButton.addEventListener(
                "click",
                function () {

                    exportAnalytics();

                }
            );
        }
    }

    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    function init() {

        console.log(
            "===================================="
        );

        console.log(
            "MediaMVP - Admin Dashboard"
        );

        console.log(
            "Modo: Local"
        );

        console.log(
            "Storage:",
            STORAGE_KEY
        );

        console.log(
            "===================================="
        );

        setupEvents();

        refreshDashboard();

        /*
         * Atualiza automaticamente o painel
         * para acompanhar alterações feitas
         * no localStorage.
         */
        setInterval(
            refreshDashboard,
            REFRESH_INTERVAL
        );
    }

    // =========================================================
    // START
    // =========================================================

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();