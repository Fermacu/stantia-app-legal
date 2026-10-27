/** Fills [data-project-cover="projectId"] from cache or Firestore coverUrl. */
(function () {
  var nodes = document.querySelectorAll('[data-project-cover]');
  if (!nodes.length) return;

  var CACHE_PREFIX = 'stantia.projectPhotos.v1.';

  function apply(el, url) {
    if (!url) return;
    if (el.tagName === 'IMG') el.src = url;
    else el.style.backgroundImage = 'url("' + url + '")';
  }

  function fromCache(id) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + id);
      if (!raw) return '';
      var parsed = JSON.parse(raw);
      return (parsed && (parsed.coverUrl || (parsed.project && parsed.project.coverUrl))) || '';
    } catch (err) {
      return '';
    }
  }

  var ids = {};
  Array.prototype.forEach.call(nodes, function (el) {
    var id = el.getAttribute('data-project-cover');
    if (!id) return;
    var cached = fromCache(id);
    if (cached) apply(el, cached);
    if (!ids[id]) ids[id] = [];
    ids[id].push(el);
  });

  var config = window.STANTIA_FIREBASE;
  if (!config || typeof firebase === 'undefined') return;

  try {
    if (!firebase.apps.length) firebase.initializeApp(config);
    var db = firebase.firestore();
    Object.keys(ids).forEach(function (id) {
      db.collection('websiteProjects')
        .doc(id)
        .get()
        .then(function (snap) {
          if (!snap.exists) return;
          var data = snap.data() || {};
          if (data.published === false) return;
          var url = typeof data.coverUrl === 'string' ? data.coverUrl : '';
          if (!url) return;
          ids[id].forEach(function (el) {
            apply(el, url);
          });
        })
        .catch(function () {});
    });
  } catch (err) {
    // ignore
  }
})();
