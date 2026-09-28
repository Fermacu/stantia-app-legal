/**
 * Apply saved theme and accent before first paint.
 * Keep accent tokens in sync with the mobile app palettes.
 */
(function () {
  var ACCENTS = {
    lime: 1,
    purple: 1,
    emerald: 1,
    amber: 1,
    rose: 1,
    sky: 1,
    orange: 1,
    teal: 1,
    indigo: 1,
    gray: 1,
  };
  var theme = "dark";
  var accent = "lime";
  try {
    var storedTheme = localStorage.getItem("stantia-site-theme");
    var storedAccent = localStorage.getItem("stantia-site-accent");
    if (storedTheme === "light" || storedTheme === "dark") theme = storedTheme;
    if (storedAccent && ACCENTS[storedAccent]) accent = storedAccent;
  } catch (_) {}
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-accent", accent);
})();
