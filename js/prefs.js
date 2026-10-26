/**
 * Apply saved accent before first paint. The site stays dark.
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
    teal: 1,
    indigo: 1,
    gray: 1,
  };
  var accent = "lime";
  try {
    var storedAccent = localStorage.getItem("stantia-site-accent");
    if (storedAccent && ACCENTS[storedAccent]) accent = storedAccent;
    localStorage.setItem("stantia-site-theme", "dark");
  } catch (_) {}
  document.documentElement.setAttribute("data-theme", "dark");
  document.documentElement.setAttribute("data-accent", accent);
})();
