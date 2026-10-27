(function () {
  var grid = document.querySelector('.project-gallery__grid');
  var lang = (document.documentElement.lang || 'en').toLowerCase();
  var isEs = lang.indexOf('es') === 0;
  var CACHE_PREFIX = 'stantia.projectPhotos.v1.';

  function projectIdFromPage() {
    if (grid && grid.getAttribute('data-project-id')) return grid.getAttribute('data-project-id');
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get('id');
    if (fromQuery) return fromQuery;
    var parts = window.location.pathname.replace(/\/+$/, '').split('/');
    var leaf = parts[parts.length - 1];
    if (leaf && leaf !== 'projects' && leaf !== 'view') return leaf;
    return 'liga-bjj';
  }

  var projectId = projectIdFromPage();
  var alt = (grid && grid.getAttribute('data-alt')) || 'Stantia';
  var fallbackHtml = grid ? grid.innerHTML : '';
  var banner = document.querySelector('.home-work__photo');
  var titleEl = document.querySelector('[data-project-title]');
  var subtitleEl = document.querySelector('[data-project-subtitle]');
  var summaryEl = document.querySelector('[data-project-summary]');
  var sportEl = document.querySelector('[data-project-sport]');
  var locationEl = document.querySelector('[data-project-location]');
  var sectionEl = document.querySelector('.home-work');
  var gallerySection = document.querySelector('.project-gallery');
  var galleryReady = false;

  function pick(data, enKey, esKey) {
    if (isEs) {
      var es = data[esKey];
      if (typeof es === 'string' && es.trim()) return es.trim();
    }
    var en = data[enKey];
    return typeof en === 'string' ? en.trim() : '';
  }

  function stampMillis(stamp) {
    if (!stamp) return '';
    if (typeof stamp.toMillis === 'function') return String(stamp.toMillis());
    if (typeof stamp.seconds === 'number') return String(stamp.seconds * 1000);
    if (typeof stamp === 'number') return String(stamp);
    if (typeof stamp === 'string') return stamp;
    return '';
  }

  function revisionOf(data) {
    // Only photo mutations bump this — editing title/chips keeps the photo cache.
    return stampMillis(data.photosUpdatedAt);
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + projectId);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.photos) || !parsed.photos.length) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function writeCache(revision, photos, data) {
    try {
      var slim = photos.map(function (photo) {
        return {
          url: photo.url || photo.fullUrl || '',
          fullUrl: photo.fullUrl || photo.url || '',
          order: typeof photo.order === 'number' ? photo.order : 0,
          fileName: typeof photo.fileName === 'string' ? photo.fileName : '',
        };
      }).filter(function (photo) {
        return Boolean(photo.url);
      });
      localStorage.setItem(
        CACHE_PREFIX + projectId,
        JSON.stringify({
          revision: revision,
          photos: slim,
          coverUrl: typeof data.coverUrl === 'string' ? data.coverUrl : '',
          project: {
            title: data.title || '',
            titleEs: data.titleEs || '',
            subtitle: data.subtitle || '',
            subtitleEs: data.subtitleEs || '',
            summary: data.summary || '',
            summaryEs: data.summaryEs || '',
            sport: data.sport || '',
            sportEs: data.sportEs || '',
            location: data.location || '',
            locationEs: data.locationEs || '',
            coverUrl: data.coverUrl || '',
            published: data.published !== false,
          },
          savedAt: Date.now(),
        }),
      );
    } catch (err) {
      // Quota / private mode — ignore.
    }
  }

  function applyMeta(data) {
    var title = pick(data, 'title', 'titleEs') || projectId;
    var subtitle = pick(data, 'subtitle', 'subtitleEs');
    var summary = pick(data, 'summary', 'summaryEs');
    var sport = pick(data, 'sport', 'sportEs');
    var location = pick(data, 'location', 'locationEs');
    alt = title;
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) {
      subtitleEl.textContent = subtitle;
      subtitleEl.hidden = !subtitle;
    }
    if (summaryEl) {
      summaryEl.textContent = summary;
      summaryEl.hidden = !summary;
    }
    if (sportEl) {
      sportEl.textContent = sport;
      var sportWrap = sportEl.closest('.project-fact, .project-chip');
      if (sportWrap) sportWrap.hidden = !sport;
    }
    if (locationEl) {
      locationEl.textContent = location;
      var locWrap = locationEl.closest('.project-fact, .project-chip');
      if (locWrap) locWrap.hidden = !location;
    }
    if (sectionEl) sectionEl.setAttribute('aria-label', title);
    if (gallerySection) gallerySection.setAttribute('aria-label', isEs ? 'Galería' : 'Gallery');
    if (grid) grid.setAttribute('data-alt', title);
    document.title = title + ' — Stantia';
  }

  function showSkeletons(count) {
    if (!grid) return;
    var html = '';
    for (var i = 0; i < count; i += 1) {
      html += '<div class="project-gallery__skeleton" aria-hidden="true"><span></span></div>';
    }
    grid.innerHTML = html;
    grid.setAttribute('aria-busy', 'true');
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderPhotos(photos) {
    if (!grid) return;
    var html = '';
    photos.forEach(function (photo) {
      var src = photo.url || photo.fullUrl || '';
      var full = photo.fullUrl || photo.url || src;
      if (!src) return;
      html +=
        '<button class="project-gallery__item" type="button" data-src="' +
        escapeAttr(src) +
        '" data-full="' +
        escapeAttr(full) +
        '" data-alt="' +
        escapeAttr(alt) +
        '">' +
        '<span class="project-gallery__thumb-loader" aria-hidden="true"></span>' +
        '<img src="' +
        escapeAttr(src) +
        '" alt="" loading="lazy" decoding="async" />' +
        '</button>';
    });
    grid.innerHTML = html;
    grid.removeAttribute('aria-busy');
  }

  function bindThumbLoaders() {
    if (!grid) return;
    grid.querySelectorAll('.project-gallery__item').forEach(function (item) {
      var img = item.querySelector('img');
      var loader = item.querySelector('.project-gallery__thumb-loader');
      if (!img) return;
      function done() {
        item.classList.add('is-loaded');
      }
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
      if (!loader) item.classList.add('is-loaded');
    });
  }

  function finishGallery() {
    if (typeof window.initProjectGallery === 'function') window.initProjectGallery();
    bindThumbLoaders();
    galleryReady = true;
  }

  function finishWithFallback(data) {
    if (data) applyMeta(data);
    if (grid) {
      grid.innerHTML = fallbackHtml;
      grid.removeAttribute('aria-busy');
    }
    finishGallery();
  }

  function finishWithRemote(photos, coverUrl, data, fromCache) {
    if (data) applyMeta(data);
    if (coverUrl && banner) {
      if (banner.tagName === 'IMG') banner.src = coverUrl;
      else banner.style.backgroundImage = 'url("' + coverUrl + '")';
    }
    if (photos.length) renderPhotos(photos);
    else if (grid) {
      grid.innerHTML = fallbackHtml || '';
      grid.removeAttribute('aria-busy');
    }
    if (!fromCache || !galleryReady) finishGallery();
    else bindThumbLoaders();
  }

  var cached = readCache();
  if (cached) {
    // Paint instantly from localStorage; browser HTTP cache serves the image bytes.
    finishWithRemote(
      cached.photos,
      cached.coverUrl || (cached.project && cached.project.coverUrl) || null,
      cached.project || {},
      true,
    );
  } else if (grid) {
    showSkeletons(12);
  }

  var config = window.STANTIA_FIREBASE;
  if (!config || typeof firebase === 'undefined') {
    if (!cached) finishWithFallback(null);
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(config);
    var db = firebase.firestore();
    var projectRef = db.collection('websiteProjects').doc(projectId);

    projectRef
      .get()
      .then(function (projectSnap) {
        if (!projectSnap.exists) {
          if (!cached) finishWithFallback(null);
          return null;
        }
        var data = projectSnap.data() || {};
        if (data.published === false) {
          if (!cached) finishWithFallback(data);
          return null;
        }

        var revision = revisionOf(data);
        // Cache hit: same photosUpdatedAt, or legacy cache while project has no revision yet.
        if (
          cached &&
          cached.photos &&
          cached.photos.length &&
          ((revision && cached.revision === revision) || (!revision && cached.revision))
        ) {
          applyMeta(data);
          if (data.coverUrl && banner && banner.tagName === 'IMG') banner.src = data.coverUrl;
          return null;
        }

        return projectRef
          .collection('photos')
          .orderBy('order', 'asc')
          .get()
          .then(function (photosSnap) {
            var photos = [];
            photosSnap.forEach(function (doc) {
              photos.push(doc.data());
            });
            var cover =
              typeof data.coverUrl === 'string' && data.coverUrl
                ? data.coverUrl
                : photos[0]
                  ? photos[0].url || photos[0].fullUrl || null
                  : null;
            if (photos.length) {
              writeCache(revision || 'legacy:' + photos.length, photos, Object.assign({}, data, { coverUrl: cover || '' }));
            }
            finishWithRemote(photos, cover, data, false);
          });
      })
      .catch(function () {
        if (!cached) finishWithFallback(null);
      });
  } catch (err) {
    if (!cached) finishWithFallback(null);
  }
})();
