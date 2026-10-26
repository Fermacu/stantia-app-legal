/**
 * Shared helpers for Stantia legal site (EN + ES).
 * - Fills © year
 * - Settings: language and accent (same palette as the app). Theme stays dark.
 * - Optional first-visit redirect to /es/ when browser language is Spanish
 */
(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var LANG_KEY = "stantia-legal-lang";
  var ACCENT_KEY = "stantia-site-accent";

  var ACCENTS = [
    { id: "lime", en: "Lime", es: "Lima", swatch: "#C9FF00" },
    { id: "purple", en: "Purple", es: "Morado", swatch: "#8B5CF6" },
    { id: "emerald", en: "Emerald", es: "Esmeralda", swatch: "#10B981" },
    { id: "amber", en: "Amber", es: "Ámbar", swatch: "#F59E0B" },
    { id: "rose", en: "Rose", es: "Rosa", swatch: "#F472B6" },
    { id: "sky", en: "Sky", es: "Cielo", swatch: "#0EA5E9" },
    { id: "teal", en: "Teal", es: "Verde azulado", swatch: "#14B8A6" },
    { id: "indigo", en: "Indigo", es: "Índigo", swatch: "#6366F1" },
    { id: "gray", en: "Gray", es: "Gris", swatch: "#737373" },
  ];

  var path = window.location.pathname || "/";
  var isEs = /\/es(\/|$)/.test(path);
  var currentLang = isEs ? "es" : "en";
  document.documentElement.lang = currentLang;

  function copy(en, es) {
    return currentLang === "es" ? es : en;
  }

  function mountDrawer() {
    var header = document.querySelector(".site-header__inner");
    var nav = header && header.querySelector(".nav");
    if (!header || !nav) return;

    var mq = window.matchMedia("(max-width: 720px)");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pieces = [];

    function remember(el) {
      if (!el || !el.parentNode) return;
      pieces.push({ el: el, parent: el.parentNode, next: el.nextSibling });
    }

    remember(nav);
    remember(header.querySelector(".nav-home"));
    remember(header.querySelector(".nav-cta"));
    remember(header.querySelector(".lang-switch"));

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-drawer__toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "site-nav");
    toggle.setAttribute("aria-label", copy("Menu", "Menú"));
    toggle.innerHTML = '<span class="nav-drawer__glyph" aria-hidden="true"></span>';

    var backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "nav-drawer__backdrop";
    backdrop.setAttribute("aria-label", copy("Close menu", "Cerrar menú"));
    backdrop.tabIndex = -1;

    var drawer = document.createElement("div");
    drawer.className = "nav-drawer";
    drawer.id = "site-nav";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", copy("Menu", "Menú"));

    var actions = header.querySelector(".header-actions") || header;
    actions.insertBefore(toggle, actions.firstChild);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    document.body.classList.add("has-drawer");

    var open = false;
    var tracking = false;
    var fromEdge = false;
    var startX = 0;
    var startY = 0;
    var dragX = 0;

    function park() {
      pieces.forEach(function (item) {
        drawer.appendChild(item.el);
      });
    }

    function restore() {
      if (!pieces.length) return;
      var parent = pieces[0].parent;
      for (var i = pieces.length - 1; i >= 0; i--) {
        parent.insertBefore(pieces[i].el, parent.firstChild);
      }
    }

    function setOpen(next) {
      open = next;
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
      drawer.style.transform = "";
      backdrop.style.opacity = "";
    }

    function sync() {
      if (mq.matches) {
        park();
        drawer.setAttribute("aria-hidden", open ? "false" : "true");
      } else {
        setOpen(false);
        restore();
      }
    }

    toggle.addEventListener("click", function () {
      if (!mq.matches) return;
      setOpen(!open);
    });
    backdrop.addEventListener("click", function () {
      setOpen(false);
    });
    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && open) setOpen(false);
    });

    document.addEventListener("touchstart", function (event) {
      if (!mq.matches || !event.touches.length) return;
      var touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      dragX = 0;
      fromEdge = !open && startX <= 28;
      tracking = open || fromEdge;
    }, { passive: true });

    document.addEventListener("touchmove", function (event) {
      if (!tracking || !event.touches.length) return;
      var touch = event.touches[0];
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (!dragX && Math.abs(dy) > Math.abs(dx)) {
        tracking = false;
        return;
      }
      var width = drawer.getBoundingClientRect().width || 320;
      var offset = open ? Math.max(-width, Math.min(0, dx)) : Math.min(0, Math.max(-width, -width + dx));
      if (!open && dx <= 0) return;
      dragX = dx;
      if (!reduce) drawer.classList.add("is-dragging");
      drawer.style.transform = "translate3d(" + offset + "px,0,0)";
      backdrop.style.opacity = String(Math.max(0, (width + offset) / width));
      if (event.cancelable) event.preventDefault();
    }, { passive: false });

    document.addEventListener("touchend", function () {
      if (!tracking) return;
      var width = drawer.getBoundingClientRect().width || 320;
      drawer.classList.remove("is-dragging");
      if (dragX) {
        var offset = open ? Math.max(-width, Math.min(0, dragX)) : Math.min(0, Math.max(-width, -width + dragX));
        setOpen(offset > -width * 0.55);
      }
      tracking = false;
      fromEdge = false;
      dragX = 0;
    });

    if (mq.addEventListener) mq.addEventListener("change", sync);
    else if (mq.addListener) mq.addListener(sync);
    sync();
  }

  function mountSettings() {
    var header = document.querySelector(".site-header__inner");
    if (!header || header.querySelector(".settings-root")) return;

    var langLinks = {};
    document.querySelectorAll(".lang-switch a[data-lang]").forEach(function (link) {
      var lang = link.getAttribute("data-lang");
      if (lang === "en" || lang === "es") langLinks[lang] = link.getAttribute("href");
    });

    function langHref(targetLang) {
      if (langLinks[targetLang]) return langLinks[targetLang];
      var here = window.location.pathname || "/";
      var base = here.indexOf("/stantia-app-legal") === 0 ? "/stantia-app-legal" : "";
      var rest = here.slice(base.length) || "/";
      var tail = window.location.search + window.location.hash;
      var next = rest;
      if (targetLang === "es") {
        if (!(rest === "/es" || rest.indexOf("/es/") === 0)) {
          next = "/es" + (rest === "/" ? "/" : rest);
        }
      } else {
        next = rest.replace(/^\/es(?=\/|$)/, "") || "/";
      }
      if (next.charAt(0) !== "/") next = "/" + next;
      if (next !== "/" && !/\/$/.test(next) && !/\.[a-z0-9]+$/i.test(next)) next += "/";
      return base + next + tail;
    }

    document.documentElement.setAttribute("data-theme", "dark");
    try {
      localStorage.setItem("stantia-site-theme", "dark");
    } catch (_) {}
    var accent = document.documentElement.getAttribute("data-accent") || "lime";
    if (!ACCENTS.some(function (item) { return item.id === accent; })) accent = "lime";

    var root = document.createElement("div");
    root.className = "settings-root";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "settings-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "site-settings");
    toggle.setAttribute("aria-label", copy("Settings", "Configuración"));
    toggle.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">' +
      '<path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.22-1.14.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.49.4 1.04.72 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.22 1.14-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"/>' +
      "</svg>";

    var panel = document.createElement("div");
    panel.className = "settings-panel";
    panel.id = "site-settings";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", copy("Settings", "Configuración"));

    var title = document.createElement("p");
    title.className = "settings-panel__title";
    title.textContent = copy("Settings", "Configuración");

    function sectionLabel(text) {
      var el = document.createElement("p");
      el.className = "settings-panel__label";
      el.textContent = text;
      return el;
    }

    function segmented(name, options, activeId, onPick) {
      var group = document.createElement("div");
      group.className = "settings-segment";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", name);
      options.forEach(function (option) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "settings-segment__btn";
        button.textContent = option.label;
        button.setAttribute("aria-pressed", option.id === activeId ? "true" : "false");
        button.addEventListener("click", function () {
          onPick(option.id, button);
        });
        group.appendChild(button);
      });
      return group;
    }

    var langOptions = [
      { id: "en", label: "English" },
      { id: "es", label: "Español" },
    ];

    var langGroup = segmented(copy("Language", "Idioma"), langOptions, currentLang, function (id) {
      if (id === currentLang) return;
      try {
        localStorage.setItem(LANG_KEY, id);
      } catch (_) {}
      window.location.href = langHref(id);
    });

    var accentRow = document.createElement("div");
    accentRow.className = "settings-accent__row";
    var accentName = document.createElement("span");
    accentName.className = "settings-accent__name";

    function paintAccentName() {
      var match = ACCENTS.filter(function (item) { return item.id === accent; })[0] || ACCENTS[0];
      accentName.textContent = currentLang === "es" ? match.es : match.en;
    }
    paintAccentName();

    var swatches = document.createElement("div");
    swatches.className = "settings-swatches";
    ACCENTS.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "settings-swatch";
      button.style.background = item.swatch;
      button.dataset.accent = item.id;
      button.setAttribute("aria-label", currentLang === "es" ? item.es : item.en);
      button.setAttribute("aria-pressed", item.id === accent ? "true" : "false");
      button.addEventListener("click", function () {
        accent = item.id;
        document.documentElement.setAttribute("data-accent", accent);
        try {
          localStorage.setItem(ACCENT_KEY, accent);
        } catch (_) {}
        swatches.querySelectorAll(".settings-swatch").forEach(function (swatch) {
          swatch.setAttribute("aria-pressed", swatch.dataset.accent === accent ? "true" : "false");
        });
        paintAccentName();
      });
      swatches.appendChild(button);
    });

    var accentHead = document.createElement("div");
    accentHead.className = "settings-accent__head";
    var accentLabel = document.createElement("span");
    accentLabel.textContent = copy("Accent", "Acento");
    accentHead.appendChild(accentLabel);
    accentHead.appendChild(accentName);

    panel.appendChild(title);
    panel.appendChild(sectionLabel(copy("Language", "Idioma")));
    panel.appendChild(langGroup);
    panel.appendChild(accentHead);
    panel.appendChild(swatches);

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(panel.hidden);
    });

    panel.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    document.addEventListener("click", function () {
      if (!panel.hidden) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });

    root.appendChild(toggle);
    root.appendChild(panel);
    var actions = header.querySelector(".header-actions") || header;
    actions.appendChild(root);
  }

  mountSettings();
  mountDrawer();

  try {
    document.querySelectorAll(".lang-switch a[data-lang]").forEach(function (link) {
      link.addEventListener("click", function () {
        var lang = link.getAttribute("data-lang");
        if (lang === "en" || lang === "es") {
          localStorage.setItem(LANG_KEY, lang);
        }
      });
    });
  } catch (_) {}

  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("noredirect") === "1") return;

    var pref = localStorage.getItem(LANG_KEY);
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
