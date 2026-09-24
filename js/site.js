/**
 * Shared helpers for Stantia legal site (EN + ES).
 * - Fills © year
 * - Remembers language choice when tapping EN/ES
 * - Optional first-visit redirect to /es/ when browser language is Spanish
 */
(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var STORAGE_KEY = "stantia-legal-lang";
  var path = window.location.pathname || "/";
  var isEs = /\/es(\/|$)/.test(path);
  var currentLang = isEs ? "es" : "en";

  document.documentElement.lang = currentLang;

  try {
    document.querySelectorAll(".lang-switch a[data-lang]").forEach(function (link) {
      link.addEventListener("click", function () {
        var lang = link.getAttribute("data-lang");
        if (lang === "en" || lang === "es") {
          localStorage.setItem(STORAGE_KEY, lang);
        }
      });
    });
  } catch (_) {}

  // Auto-redirect once: Spanish browser → /es/ (unless user already chose EN).
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("noredirect") === "1") return;

    var pref = localStorage.getItem(STORAGE_KEY);
    if (pref === "en" || pref === "es") return;
    if (isEs) return;

    var navLang = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (!navLang.indexOf || navLang.indexOf("es") !== 0) return;

    var base = path.indexOf("/stantia-app-legal") === 0 ? "/stantia-app-legal" : "";
    var rest = path;
    if (base && rest.indexOf(base) === 0) {
      rest = rest.slice(base.length) || "/";
    }
    if (rest.indexOf("/es/") === 0 || rest === "/es") return;

    var target = base + "/es" + (rest === "/" ? "/" : rest);
    if (!/\/$/.test(target) && !/\.[a-z0-9]+$/i.test(target)) {
      target += "/";
    }
    window.location.replace(target);
  } catch (_) {}
})();
