(function () {
  var grid = document.querySelector('.project-gallery__grid');
  var lang = (document.documentElement.lang || 'en').toLowerCase();
  var isEs = lang.indexOf('es') === 0;
  var CACHE_PREFIX = 'stantia.projectPhotos.v2.';

  function projectIdFromPage() {
    if (grid && grid.getAttribute('data-project-id')) return grid.getAttribute('data-project-id');
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get('id');
    if (fromQuery) return fromQuery;
    var parts = window.location.pathname.replace(/\/+$/, '').split('/');
    var leaf = parts[parts.length - 1];
    if (leaf && leaf !== 'studio' && leaf !== 'view') return leaf;
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
  var latestPhotos = [];
  var accessMode = 'any_stantia_user';

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
      var slim = photos
        .map(function (photo) {
          return {
            id: photo.id || '',
            url: photo.url || '',
            order: typeof photo.order === 'number' ? photo.order : 0,
            fileName: typeof photo.fileName === 'string' ? photo.fileName : '',
          };
        })
        .filter(function (photo) {
          return Boolean(photo.url);
        });
      localStorage.setItem(
        CACHE_PREFIX + projectId,
        JSON.stringify({
          revision: revision,
          photos: slim,
          coverUrl: typeof data.coverUrl === 'string' ? data.coverUrl : '',
          accessMode: data.accessMode === 'invite_only' ? 'invite_only' : 'any_stantia_user',
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
            accessMode: data.accessMode === 'invite_only' ? 'invite_only' : 'any_stantia_user',
          },
          savedAt: Date.now(),
        }),
      );
    } catch (err) {}
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

  function isUnlocked() {
    return window.StantiaProjectAuth && window.StantiaProjectAuth.isUnlocked(projectId);
  }

  function renderPhotos(photos) {
    if (!grid) return;
    latestPhotos = photos.slice();
    var unlocked = isUnlocked();
    window.StantiaProjectPreviews = window.StantiaProjectPreviews || {};
    var html = '';
    photos.forEach(function (photo) {
      var preview = photo.url || '';
      if (!preview) return;
      var photoId = photo.id || '';
      if (photoId) window.StantiaProjectPreviews[photoId] = preview;
      html +=
        '<button class="project-gallery__item' +
        (unlocked ? ' is-selectable' : '') +
        '" type="button" data-photo-id="' +
        escapeAttr(photoId) +
        '" data-access="' +
        (unlocked ? 'full' : 'limited') +
        '" data-alt="' +
        escapeAttr(alt) +
        '" data-file-name="' +
        escapeAttr(photo.fileName || '') +
        '">' +
        '<span class="project-gallery__thumb-loader" aria-hidden="true"></span>' +
        '<img src="' +
        escapeAttr(preview) +
        '" alt="" loading="lazy" decoding="async" draggable="false" />' +
        (unlocked
          ? '<span class="project-gallery__check" aria-hidden="true"></span>'
          : '') +
        '</button>';
    });
    grid.innerHTML = html;
    grid.removeAttribute('aria-busy');
    grid.setAttribute('data-project-id', projectId);
  }

  function bindThumbLoaders() {
    if (!grid) return;
    grid.querySelectorAll('.project-gallery__item').forEach(function (item) {
      var img = item.querySelector('img');
      if (!img) return;
      function done() {
        item.classList.add('is-loaded');
      }
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  }

  function finishGallery() {
    if (typeof window.initProjectGallery === 'function') {
      window.initProjectGallery({
        projectId: projectId,
        unlocked: isUnlocked(),
      });
    }
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

  function mountAuth(data) {
    accessMode = data && data.accessMode === 'invite_only' ? 'invite_only' : 'any_stantia_user';
    if (window.StantiaProjectAuth && typeof window.StantiaProjectAuth.mount === 'function') {
      window.StantiaProjectAuth.mount(projectId, accessMode);
    }
  }

  function finishWithRemote(photos, coverUrl, data, fromCache) {
    if (data) {
      applyMeta(data);
      mountAuth(data);
    }
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
    else {
      if (typeof window.setProjectGalleryAccess === 'function') {
        window.setProjectGalleryAccess({ projectId: projectId, unlocked: isUnlocked() });
      }
      bindThumbLoaders();
    }
  }

  function refreshAccessUi() {
    if (!latestPhotos.length) return;
    renderPhotos(latestPhotos);
    if (typeof window.setProjectGalleryAccess === 'function') {
      window.setProjectGalleryAccess({ projectId: projectId, unlocked: isUnlocked() });
    } else {
      finishGallery();
    }
    bindThumbLoaders();
  }

  var lastAccessKey = '';
  if (window.StantiaProjectAuth && typeof window.StantiaProjectAuth.onChange === 'function') {
    window.StantiaProjectAuth.onChange(function (state) {
      if (!galleryReady) return;
      var key = [
        state && state.user && state.user.uid ? state.user.uid : '',
        state && state.unlocked ? 1 : 0,
        state && state.accessMode ? state.accessMode : '',
      ].join('|');
      if (key === lastAccessKey) return;
      lastAccessKey = key;
      refreshAccessUi();
    });
  }

  var config = window.STANTIA_FIREBASE;
  if (!config || typeof firebase === 'undefined') {
    var cachedNoFirebase = readCache();
    if (cachedNoFirebase) {
      finishWithRemote(
        cachedNoFirebase.photos,
        cachedNoFirebase.coverUrl ||
          (cachedNoFirebase.project && cachedNoFirebase.project.coverUrl) ||
          null,
        Object.assign({}, cachedNoFirebase.project || {}, {
          accessMode:
            cachedNoFirebase.accessMode === 'invite_only' ||
            (cachedNoFirebase.project && cachedNoFirebase.project.accessMode === 'invite_only')
              ? 'invite_only'
              : 'any_stantia_user',
        }),
        true,
      );
    } else {
      finishWithFallback(null);
    }
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(config);
  } catch (initErr) {}

  var cached = readCache();
  if (cached) {
    accessMode =
      cached.accessMode === 'invite_only' ||
      (cached.project && cached.project.accessMode === 'invite_only')
        ? 'invite_only'
        : 'any_stantia_user';
    finishWithRemote(
      cached.photos,
      cached.coverUrl || (cached.project && cached.project.coverUrl) || null,
      Object.assign({}, cached.project || {}, { accessMode: accessMode }),
      true,
    );
  } else if (grid) {
    showSkeletons(12);
  }

  try {
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

        mountAuth(data);

        var revision = revisionOf(data);
        if (
          cached &&
          cached.photos &&
          cached.photos.length &&
          ((revision && cached.revision === revision) || (!revision && cached.revision))
        ) {
          applyMeta(data);
          mountAuth(data);
          if (data.coverUrl && banner && banner.tagName === 'IMG') banner.src = data.coverUrl;
          if (galleryReady) refreshAccessUi();
          return null;
        }

        return projectRef
          .collection('photos')
          .orderBy('order', 'asc')
          .get()
          .then(function (photosSnap) {
            var photos = [];
            photosSnap.forEach(function (docSnap) {
              var row = docSnap.data() || {};
              row.id = docSnap.id;
              photos.push(row);
            });
            var cover =
              typeof data.coverUrl === 'string' && data.coverUrl
                ? data.coverUrl
                : photos[0]
                  ? photos[0].url || null
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
