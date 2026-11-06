(function () {
  var bound = false;
  var protectBound = false;
  var watermarkCache = {};
  var logoPromise = null;
  var WATERMARK_VERSION = 14;
  var PREVIEW_MAX_EDGE = 1400;
  var THUMB_MAX_EDGE = 900;
  var galleryState = {
    projectId: '',
    unlocked: false,
    items: [],
    index: 0,
    selected: {},
  };

  function previewById(photoId) {
    if (!photoId || !window.StantiaProjectPreviews) return '';
    return window.StantiaProjectPreviews[photoId] || '';
  }

  function masterSrc(item) {
    var id = item.getAttribute('data-photo-id') || '';
    var fromMap = previewById(id);
    if (fromMap) return fromMap;
    var preview = item.getAttribute('data-preview') || item.getAttribute('data-src') || '';
    if (preview) return preview;
    return item.getAttribute('data-full') || '';
  }

  function scrubSensitiveAttrs(node) {
    if (!node || !node.removeAttribute) return;
    node.removeAttribute('data-src');
    node.removeAttribute('data-preview');
    node.removeAttribute('data-full');
  }

  function fileName(item, src) {
    var explicit = item.getAttribute && item.getAttribute('data-file-name');
    if (explicit) return explicit;
    var label = ((item && item.alt) || (item && item.getAttribute && item.getAttribute('data-alt')) || 'stantia')
      .replace(/[^\w]+/g, '-')
      .replace(/^-|-$/g, '');
    var leaf = (src.split('/').pop() || 'photo.JPG').split('?')[0].replace(/^IMG_/i, '');
    return (label ? label + '-' : '') + leaf;
  }

  function absoluteUrl(url) {
    return new URL(url, window.location.href).href;
  }

  function isEs() {
    return (document.documentElement.lang || '').toLowerCase().indexOf('es') === 0;
  }

  function isProtectedTarget(target) {
    if (!target || !target.closest) return false;
    return Boolean(
      target.closest(
        '.project-gallery, .project-lightbox, .project-gallery__item, .project-lightbox__stage',
      ),
    );
  }

  function bindMediaProtection() {
    if (protectBound) return;
    protectBound = true;
    var block = function (event) {
      if (galleryState.unlocked) return;
      if (!isProtectedTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener('contextmenu', block, true);
    document.addEventListener('dragstart', block, true);
    document.addEventListener('selectstart', block, true);
  }

  function resolveLogoUrl() {
    var fromPage = document.querySelector('.home-foot__logo, .brand__wordmark, .studio-header__logo img');
    if (fromPage && fromPage.getAttribute('src')) {
      return absoluteUrl(fromPage.getAttribute('src').split('?')[0]);
    }
    return absoluteUrl('../assets/logo-wordmark.png');
  }

  function loadImage(url, withCors) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (withCors) img.crossOrigin = 'anonymous';
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('image'));
      };
      img.src = url;
    });
  }

  function getLogo() {
    if (!logoPromise) {
      logoPromise = loadImage(resolveLogoUrl(), true).catch(function () {
        return loadImage(resolveLogoUrl(), false);
      });
    }
    return logoPromise;
  }

  function drawWatermark(ctx, width, height, logo) {
    var tileW = Math.max(220, Math.min(width, height) * 0.26);
    var tileH = tileW * (logo.naturalHeight / Math.max(1, logo.naturalWidth));
    var gapX = tileW * 2.9;
    var gapY = tileH * 3.8;
    var alphas = [0.12, 0.18, 0.24, 0.16, 0.2, 0.14];
    var row = 0;
    var col = 0;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-22 * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);
    for (var y = -gapY; y < height + gapY * 2; y += gapY) {
      col = 0;
      for (var x = -gapX; x < width + gapX * 2; x += gapX) {
        var solid = (row + col * 2) % 5 === 0 || (row * 4 + col) % 8 === 0;
        var vivid = !solid && ((row * 3 + col) % 4 === 0);
        var strong = !solid && !vivid && (row + col) % 3 === 0;
        var alpha = alphas[(row * 3 + col) % alphas.length];
        var size = tileW;
        var dx = x + ((row % 2) * gapX) / 2;
        if (solid) {
          alpha = 1;
          size = tileW * 1.08;
        } else if (vivid) {
          alpha = 0.92;
          size = tileW * 1.05;
        } else if (strong) {
          alpha = Math.min(0.55, alpha + 0.22);
        }
        var sizeH = size * (logo.naturalHeight / Math.max(1, logo.naturalWidth));
        ctx.save();
        ctx.globalAlpha = alpha;
        if (vivid || solid) {
          ctx.shadowColor = 'rgba(255, 255, 255, 0.65)';
          ctx.shadowBlur = Math.max(10, size * 0.05);
        }
        ctx.drawImage(logo, dx - (size - tileW) / 2, y - (sizeH - tileH) / 2, size, sizeH);
        ctx.restore();
        col += 1;
      }
      row += 1;
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 14;
    var corner = Math.max(96, Math.min(width, height) * 0.12);
    var cornerH = corner * (logo.naturalHeight / Math.max(1, logo.naturalWidth));
    var pad = Math.max(18, Math.min(width, height) * 0.03);
    ctx.drawImage(logo, width - corner - pad, height - cornerH - pad, corner, cornerH);
    ctx.restore();
  }

  function fitEdge(srcW, srcH, maxEdge) {
    var limit = maxEdge || PREVIEW_MAX_EDGE;
    var edge = Math.max(srcW, srcH);
    if (edge <= limit) return { width: srcW, height: srcH };
    var scale = limit / edge;
    return {
      width: Math.max(1, Math.round(srcW * scale)),
      height: Math.max(1, Math.round(srcH * scale)),
    };
  }

  function watermarkBlob(url, maxEdge) {
    var source = absoluteUrl(url);
    var limit = maxEdge || PREVIEW_MAX_EDGE;
    var cacheKey = source + '#wm' + WATERMARK_VERSION + '-lim' + limit;
    if (watermarkCache[cacheKey] && watermarkCache[cacheKey].blob) {
      return Promise.resolve(watermarkCache[cacheKey]);
    }
    return Promise.all([loadImage(source, true), getLogo()])
      .then(function (pair) {
        var photo = pair[0];
        var logo = pair[1];
        var srcW = photo.naturalWidth || photo.width;
        var srcH = photo.naturalHeight || photo.height;
        if (!srcW || !srcH) throw new Error('size');
        var fitted = fitEdge(srcW, srcH, limit);
        var canvas = document.createElement('canvas');
        canvas.width = fitted.width;
        canvas.height = fitted.height;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(photo, 0, 0, fitted.width, fitted.height);
        drawWatermark(ctx, fitted.width, fitted.height, logo);
        return new Promise(function (resolve, reject) {
          canvas.toBlob(
            function (blob) {
              if (!blob) {
                reject(new Error('blob'));
                return;
              }
              var objectUrl = URL.createObjectURL(blob);
              watermarkCache[cacheKey] = { blob: blob, objectUrl: objectUrl };
              resolve(watermarkCache[cacheKey]);
            },
            'image/jpeg',
            0.82
          );
        });
      });
  }

  function saveBlob(blob, name) {
    if (!galleryState.unlocked) return Promise.reject(new Error('locked'));
    if (!blob || !blob.size) return Promise.reject(new Error('empty-blob'));
    var objectUrl = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = objectUrl;
    link.download = name || 'stantia-photo.jpg';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
    }, 4000);
    return Promise.resolve();
  }

  function loadJsZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      script.async = true;
      script.onload = function () {
        if (window.JSZip) resolve(window.JSZip);
        else reject(new Error('jszip'));
      };
      script.onerror = function () {
        reject(new Error('jszip'));
      };
      document.head.appendChild(script);
    });
  }

  function uniqueZipName(rawName, photoId, used) {
    var base = String(rawName || 'stantia-' + photoId + '.jpg').replace(/[\\/]+/g, '-');
    if (!/\.[a-z0-9]+$/i.test(base)) base += '.jpg';
    var name = base;
    var n = 2;
    while (used[name.toLowerCase()]) {
      name = base.replace(/(\.[^.]+)$/, '-' + n + '$1');
      n += 1;
    }
    used[name.toLowerCase()] = true;
    return name;
  }

  function downloadPhotoFiles(photos, onProgress) {
    if (!window.StantiaProjectAuth || !galleryState.projectId) {
      return Promise.reject(new Error('missing'));
    }
    var list = photos || [];
    if (!list.length) return Promise.reject(new Error('empty'));

    function report(done, total, phase) {
      if (typeof onProgress === 'function') onProgress(done, total, phase);
    }

    // One file: direct download. Multiple: ZIP (browsers block multi auto-downloads).
    if (list.length === 1) {
      report(0, 1, 'download');
      return window.StantiaProjectAuth.fetchPhotoBlob(galleryState.projectId, list[0].photoId).then(
        function (blob) {
          report(1, 1, 'download');
          return saveBlob(blob, list[0].fileName || 'stantia-' + list[0].photoId + '.jpg');
        },
      );
    }

    report(0, list.length, 'download');
    return loadJsZip().then(function (JSZip) {
      var zip = new JSZip();
      var used = {};
      var chain = Promise.resolve();
      list.forEach(function (item, index) {
        chain = chain.then(function () {
          return window.StantiaProjectAuth
            .fetchPhotoBlob(galleryState.projectId, item.photoId)
            .then(function (blob) {
              zip.file(
                uniqueZipName(item.fileName, item.photoId, used),
                blob,
              );
              report(index + 1, list.length, 'download');
            });
        });
      });
      return chain.then(function () {
        report(list.length, list.length, 'zip');
        return zip.generateAsync({ type: 'blob', compression: 'STORE' });
      }).then(function (blob) {
        var zipName =
          'stantia-' + (galleryState.projectId || 'photos') + '-' + list.length + '.zip';
        return saveBlob(blob, zipName);
      });
    });
  }

  function paintLockedThumb(item) {
    if (!item || !item.el || !item.preview) return;
    scrubSensitiveAttrs(item.el);
    var img = item.el.querySelector('img');
    if (!img) return;
    // Always show the preview first so the grid never stays blank if canvas/CORS fails.
    img.src = item.preview;
    img.removeAttribute('data-locked-thumb');
    item.el.classList.remove('is-thumb-blocked');
    function markLoaded() {
      item.el.classList.add('is-loaded');
    }
    if (img.complete && img.naturalWidth) markLoaded();
    else {
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', markLoaded, { once: true });
    }
    watermarkBlob(item.preview, THUMB_MAX_EDGE)
      .then(function (marked) {
        if (galleryState.unlocked) return;
        if (item.el.getAttribute('data-photo-id') !== item.photoId) return;
        img.src = marked.objectUrl;
        markLoaded();
      })
      .catch(function () {
        // Keep the preview src; CSS overlay still marks limited access.
      });
  }

  function syncLockedMediaPresentation() {
    galleryState.items.forEach(function (item) {
      if (!item.el) return;
      scrubSensitiveAttrs(item.el);
      var img = item.el.querySelector('img');
      if (!img) return;
      if (galleryState.unlocked) {
        item.el.classList.remove('is-thumb-blocked');
        if (item.preview) img.src = item.preview;
        item.el.classList.add('is-loaded');
        return;
      }
      paintLockedThumb(item);
    });
  }

  function selectedIds() {
    return Object.keys(galleryState.selected).filter(function (id) {
      return galleryState.selected[id];
    });
  }

  function selectedPhotos() {
    var byId = {};
    galleryState.items.forEach(function (item) {
      if (item.photoId) byId[item.photoId] = item;
    });
    return selectedIds()
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);
  }

  function cartCopy(key) {
    var es = isEs();
    var map = {
      title: es ? 'Tu selección' : 'Your selection',
      empty: es
        ? 'Todavía no hay fotos. Marca el check en cada imagen para agregarlas.'
        : 'No photos yet. Tap the check on each image to add them.',
      download: es ? 'Descargar' : 'Download',
      downloading: es ? 'Descargando…' : 'Downloading…',
      zipping: es ? 'Preparando ZIP…' : 'Preparing ZIP…',
      downloadFailed: es ? 'Error al descargar' : 'Download failed',
      signIn: es ? 'Inicia sesión' : 'Sign in',
      clear: es ? 'Vaciar' : 'Clear',
      remove: es ? 'Quitar' : 'Remove',
      count: es ? 'fotos' : 'photos',
      countOne: es ? 'foto' : 'photo',
      open: es ? 'Ver selección para descargar' : 'Open download selection',
    };
    return map[key] || '';
  }

  function gateCopy() {
    return isEs()
      ? 'Se requiere una cuenta Stantia para ver esta foto en resolución completa y descargarla.'
      : 'A Stantia account is required to view this photo in full resolution and download it.';
  }

  function setDownloadLabel(download, label) {
    if (!download) return;
    var set = false;
    Array.prototype.forEach.call(download.childNodes, function (node) {
      if (node.nodeType === 3 && node.textContent.trim()) {
        node.textContent = ' ' + label;
        set = true;
      }
    });
    if (!set) download.appendChild(document.createTextNode(' ' + label));
  }

  function ensureLightboxGate(box) {
    if (!box) return null;
    var stage = box.querySelector('.project-lightbox__stage');
    if (!stage) return null;
    var gate = box.querySelector('.project-lightbox__gate');
    if (!gate) {
      gate = document.createElement('div');
      gate.className = 'project-lightbox__gate';
      gate.setAttribute('role', 'status');
      gate.innerHTML = '<p class="project-lightbox__gate-text"></p>';
      stage.appendChild(gate);
    }
    return gate;
  }

  function syncLightboxAccess(box) {
    if (!box) return;
    var unlocked = galleryState.unlocked;
    var download = box.querySelector('.project-lightbox__download');
    var gate = ensureLightboxGate(box);
    var gateText = gate && gate.querySelector('.project-lightbox__gate-text');
    var limitedBadge = box.querySelector('.project-lightbox__limited');

    if (download) {
      download.disabled = !unlocked;
      setDownloadLabel(download, isEs() ? 'Descargar' : 'Download');
    }
    if (limitedBadge) limitedBadge.remove();
    if (gate) {
      if (gateText) gateText.textContent = gateCopy();
      gate.hidden = unlocked;
    }
    box.classList.toggle('is-unlocked', unlocked);
  }

  function ensureCartUi() {
    var existing = document.getElementById('stantia-project-cart');
    if (existing) return existing;

    var root = document.createElement('div');
    root.id = 'stantia-project-cart';
    root.className = 'project-cart';
    root.hidden = true;
    root.innerHTML =
      '<button type="button" class="project-cart__fab" data-cart-fab aria-label="">' +
      '  <svg class="project-cart__icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '    <path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3 5h2l1.2 8.4A2 2 0 0 0 8.2 15h8.6a2 2 0 0 0 2-1.6L20 8H6"/>' +
      '    <circle cx="9" cy="19" r="1.2" fill="currentColor"/>' +
      '    <circle cx="17" cy="19" r="1.2" fill="currentColor"/>' +
      '  </svg>' +
      '  <span class="project-cart__badge" data-cart-badge hidden>0</span>' +
      '</button>' +
      '<div class="project-cart__modal" data-cart-modal hidden>' +
      '  <div class="project-cart__dialog" role="dialog" aria-modal="true" aria-labelledby="stantia-cart-title">' +
      '    <button type="button" class="project-cart__close" data-cart-close aria-label="Close">&times;</button>' +
      '    <div class="project-cart__head">' +
      '      <h2 id="stantia-cart-title" data-cart-title></h2>' +
      '      <p data-cart-subtitle></p>' +
      '    </div>' +
      '    <div class="project-cart__empty" data-cart-empty hidden></div>' +
      '    <div class="project-cart__grid" data-cart-grid></div>' +
      '    <div class="project-cart__actions">' +
      '      <button type="button" class="project-cart__btn project-cart__btn--ghost" data-cart-clear></button>' +
      '      <button type="button" class="project-cart__btn project-cart__btn--primary" data-cart-download disabled></button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(root);

    var fab = root.querySelector('[data-cart-fab]');
    var modal = root.querySelector('[data-cart-modal]');
    var closeBtn = root.querySelector('[data-cart-close]');
    var clearBtn = root.querySelector('[data-cart-clear]');
    var downloadBtn = root.querySelector('[data-cart-download]');

    fab.addEventListener('click', function () {
      openCartModal();
    });
    closeBtn.addEventListener('click', function () {
      closeCartModal();
    });
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeCartModal();
    });
    clearBtn.addEventListener('click', function () {
      clearSelection();
      renderCartModal();
    });
    downloadBtn.addEventListener('click', function () {
      var ids = selectedIds();
      if (!ids.length) return;
      downloadBtn.disabled = true;
      downloadBtn.textContent = cartCopy('downloading');
      downloadFull(ids, function (done, total, phase) {
        if (phase === 'zip') {
          downloadBtn.textContent = cartCopy('zipping');
          return;
        }
        downloadBtn.textContent = cartCopy('downloading') + ' ' + done + '/' + total;
      })
        .then(function () {
          clearSelection();
          closeCartModal();
        })
        .catch(function (err) {
          var code = err && err.message ? String(err.message) : '';
          downloadBtn.textContent =
            code === 'auth' || code === 'locked'
              ? cartCopy('signIn')
              : cartCopy('downloadFailed');
          window.setTimeout(function () {
            renderCartModal();
          }, 1800);
        })
        .finally(function () {
          var label = downloadBtn.textContent || '';
          if (
            label.indexOf(cartCopy('downloading')) === 0 ||
            label === cartCopy('zipping')
          ) {
            downloadBtn.textContent = cartCopy('download');
            renderCartModal();
          }
        });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) {
        closeCartModal();
      }
    });

    return root;
  }

  function syncSelectedCount() {
    window.setProjectCartCount(selectedIds().length);
  }

  window.setProjectCartCount = function setProjectCartCount(count) {
    var root = ensureCartUi();
    var badge = root.querySelector('[data-cart-badge]');
    var fab = root.querySelector('[data-cart-fab]');
    var n = Number(count) || 0;
    if (badge) {
      badge.textContent = String(n);
      badge.hidden = n < 1;
    }
    if (fab) {
      fab.classList.toggle('has-items', n > 0);
      fab.setAttribute('aria-label', cartCopy('open') + (n ? ' (' + n + ')' : ''));
    }
    var modal = root.querySelector('[data-cart-modal]');
    if (modal && !modal.hidden) renderCartModal();
  };

  function setCartVisible(visible) {
    var root = ensureCartUi();
    root.hidden = !visible;
    if (!visible) closeCartModal();
  }

  function openCartModal() {
    var root = ensureCartUi();
    var modal = root.querySelector('[data-cart-modal]');
    renderCartModal();
    modal.hidden = false;
    document.body.classList.add('cart-open');
  }

  function closeCartModal() {
    var root = document.getElementById('stantia-project-cart');
    if (!root) return;
    var modal = root.querySelector('[data-cart-modal]');
    if (modal) modal.hidden = true;
    document.body.classList.remove('cart-open');
  }

  function renderCartModal() {
    var root = ensureCartUi();
    var title = root.querySelector('[data-cart-title]');
    var subtitle = root.querySelector('[data-cart-subtitle]');
    var empty = root.querySelector('[data-cart-empty]');
    var grid = root.querySelector('[data-cart-grid]');
    var clearBtn = root.querySelector('[data-cart-clear]');
    var downloadBtn = root.querySelector('[data-cart-download]');
    var photos = selectedPhotos();
    var count = photos.length;

    title.textContent = cartCopy('title');
    subtitle.textContent = count
      ? count + ' ' + (count === 1 ? cartCopy('countOne') : cartCopy('count'))
      : '';
    empty.textContent = cartCopy('empty');
    empty.hidden = count > 0;
    clearBtn.textContent = cartCopy('clear');
    clearBtn.hidden = count < 1;
    downloadBtn.textContent = cartCopy('download') + (count ? ' (' + count + ')' : '');
    downloadBtn.disabled = count < 1;

    grid.innerHTML = photos
      .map(function (photo) {
        return (
          '<article class="project-cart__item" data-photo-id="' +
          String(photo.photoId).replace(/"/g, '&quot;') +
          '">' +
          '<img src="' +
          String(photo.preview).replace(/"/g, '&quot;') +
          '" alt="" loading="lazy" decoding="async" />' +
          '<button type="button" class="project-cart__remove" data-cart-remove aria-label="' +
          cartCopy('remove') +
          '">&times;</button>' +
          '</article>'
        );
      })
      .join('');

    grid.querySelectorAll('[data-cart-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.project-cart__item');
        var photoId = card && card.getAttribute('data-photo-id');
        if (!photoId) return;
        galleryState.selected[photoId] = false;
        var thumb = document.querySelector(
          '.project-gallery__item[data-photo-id="' + photoId.replace(/"/g, '\\"') + '"]',
        );
        if (thumb) thumb.classList.remove('is-selected');
        syncSelectedCount();
        renderCartModal();
      });
    });
  }

  function clearSelection() {
    galleryState.selected = {};
    document.querySelectorAll('.project-gallery__item.is-selected').forEach(function (node) {
      node.classList.remove('is-selected');
    });
    syncSelectedCount();
  }

  function toggleSelect(photoId, el) {
    if (!photoId || !galleryState.unlocked) return;
    galleryState.selected[photoId] = !galleryState.selected[photoId];
    if (el) el.classList.toggle('is-selected', Boolean(galleryState.selected[photoId]));
    syncSelectedCount();
  }

  function downloadFull(photoIds, onProgress) {
    if (!window.StantiaProjectAuth || !galleryState.projectId || !photoIds.length) {
      return Promise.reject(new Error('missing'));
    }
    if (!galleryState.unlocked) {
      window.StantiaProjectAuth.openLogin();
      return Promise.reject(new Error('locked'));
    }
    return window.StantiaProjectAuth.downloadPhotos(galleryState.projectId, photoIds).then(function (photos) {
      if (!photos || !photos.length) throw new Error('empty');
      return downloadPhotoFiles(photos, onProgress);
    });
  }

  window.downloadSelectedProjectPhotos = function () {
    openCartModal();
  };

  window.setProjectGalleryAccess = function setProjectGalleryAccess(opts) {
    opts = opts || {};
    galleryState.projectId = opts.projectId || galleryState.projectId;
    galleryState.unlocked = Boolean(opts.unlocked);
    if (!galleryState.unlocked) galleryState.selected = {};
    setCartVisible(galleryState.unlocked);
    syncSelectedCount();

    var box = document.querySelector('.project-lightbox');
    syncLightboxAccess(box);
    document.body.classList.toggle('project-unlocked', galleryState.unlocked);
    document.body.classList.toggle('project-locked', !galleryState.unlocked);
    bindMediaProtection();

    // Re-bind item interactions after photos.js re-renders markup.
    var itemNodes = Array.prototype.slice.call(document.querySelectorAll('.project-gallery__item'));
    galleryState.items = itemNodes.map(function (node) {
      var photoId = node.getAttribute('data-photo-id') || '';
      var preview = masterSrc(node);
      if (photoId && preview) {
        window.StantiaProjectPreviews = window.StantiaProjectPreviews || {};
        window.StantiaProjectPreviews[photoId] = preview;
      }
      if (!galleryState.unlocked) scrubSensitiveAttrs(node);
      return {
        el: node,
        photoId: photoId,
        preview: preview,
        alt: node.getAttribute('data-alt') || '',
        fileName: node.getAttribute('data-file-name') || '',
      };
    });
    syncLockedMediaPresentation();
    itemNodes.forEach(function (node, itemIndex) {
      node.classList.toggle('is-selectable', galleryState.unlocked);
      node.classList.toggle('is-selected', Boolean(galleryState.selected[node.getAttribute('data-photo-id')]));
      node.onclick = function (event) {
        if (galleryState.unlocked && (event.metaKey || event.ctrlKey || event.shiftKey)) {
          event.preventDefault();
          toggleSelect(node.getAttribute('data-photo-id'), node);
          return;
        }
        if (galleryState.unlocked && event.target.closest('.project-gallery__check')) {
          event.preventDefault();
          event.stopPropagation();
          toggleSelect(node.getAttribute('data-photo-id'), node);
          return;
        }
        if (typeof galleryState._show === 'function') galleryState._show(itemIndex);
      };
      var check = node.querySelector('.project-gallery__check');
      if (check) {
        check.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          toggleSelect(node.getAttribute('data-photo-id'), node);
        };
      }
    });
  };

  window.initProjectGallery = function initProjectGallery(opts) {
    opts = opts || {};
    var gallery = document.querySelector('.project-gallery');
    var itemNodes = Array.prototype.slice.call(document.querySelectorAll('.project-gallery__item'));
    var box = document.querySelector('.project-lightbox');
    if (!itemNodes.length || !box) return;

    galleryState.projectId =
      opts.projectId ||
      (document.querySelector('.project-gallery__grid') &&
        document.querySelector('.project-gallery__grid').getAttribute('data-project-id')) ||
      galleryState.projectId;
    galleryState.unlocked = Boolean(
      opts.unlocked ||
        (window.StantiaProjectAuth && window.StantiaProjectAuth.isUnlocked(galleryState.projectId)),
    );

    var frame = box.querySelector('.project-lightbox__stage img, img');
    var stage = box.querySelector('.project-lightbox__stage');
    if (!stage && frame && frame.parentNode === box) {
      stage = document.createElement('div');
      stage.className = 'project-lightbox__stage';
      box.insertBefore(stage, frame);
      stage.appendChild(frame);
      var mark = document.createElement('div');
      mark.className = 'project-lightbox__mark';
      mark.setAttribute('aria-hidden', 'true');
      stage.appendChild(mark);
    }

    var count = box.querySelector('.project-lightbox__count');
    var download = box.querySelector('.project-lightbox__download');

    syncLightboxAccess(box);
    bindMediaProtection();

    galleryState.items = itemNodes.map(function (item) {
      var photoId = item.getAttribute('data-photo-id') || '';
      var preview = masterSrc(item);
      if (photoId && preview) {
        window.StantiaProjectPreviews = window.StantiaProjectPreviews || {};
        window.StantiaProjectPreviews[photoId] = preview;
      }
      if (!galleryState.unlocked) scrubSensitiveAttrs(item);
      return {
        el: item,
        photoId: photoId,
        preview: preview,
        alt: item.getAttribute('data-alt') || '',
        fileName: item.getAttribute('data-file-name') || '',
      };
    });

    function openGallery() {
      if (!gallery) return;
      gallery.hidden = false;
      gallery.scrollTop = 0;
      document.body.classList.add('gallery-open');
    }

    function closeGallery() {
      if (!gallery) return;
      gallery.hidden = true;
      document.body.classList.remove('gallery-open');
    }

    function show(next) {
      if (!galleryState.items.length) return;
      galleryState.index = (next + galleryState.items.length) % galleryState.items.length;
      var item = galleryState.items[galleryState.index];
      var src = item.preview;
      if (!src) return;
      if (count) count.textContent = galleryState.index + 1 + ' / ' + galleryState.items.length;
      if (download) {
        download.dataset.photoId = item.photoId || '';
        download.dataset.name = item.fileName || fileName(item.el, src);
        if (galleryState.unlocked) download.dataset.href = src;
        else delete download.dataset.href;
      }
      syncLightboxAccess(box);
      box.hidden = false;
      document.body.classList.add('lightbox-open');
      frame.removeAttribute('src');
      frame.classList.add('is-loading');
      box.classList.remove('is-overlay-mark');

      if (galleryState.unlocked) {
        frame.src = src;
        frame.alt = item.alt || '';
        frame.classList.remove('is-loading');
        return;
      }

      watermarkBlob(src, PREVIEW_MAX_EDGE)
        .then(function (marked) {
          if (galleryState.unlocked) return;
          if (galleryState.items[galleryState.index].preview !== src) return;
          frame.src = marked.objectUrl;
          frame.alt = item.alt || '';
          frame.classList.remove('is-loading');
          box.classList.remove('is-overlay-mark');
        })
        .catch(function () {
          if (galleryState.unlocked) return;
          if (galleryState.items[galleryState.index].preview !== src) return;
          frame.src = src;
          frame.alt = item.alt || '';
          frame.classList.remove('is-loading');
          box.classList.add('is-overlay-mark');
        });
    }

    galleryState._show = show;

    function closePhoto() {
      box.hidden = true;
      document.body.classList.remove('lightbox-open');
      frame.removeAttribute('src');
      frame.classList.remove('is-loading');
      box.classList.remove('is-overlay-mark');
      box.classList.remove('is-unlocked');
    }

    window.setProjectGalleryAccess({
      projectId: galleryState.projectId,
      unlocked: galleryState.unlocked,
    });

    if (frame) {
      frame.setAttribute('draggable', 'false');
      frame.oncontextmenu = function (event) {
        event.preventDefault();
      };
    }

    if (!bound) {
      bound = true;
      var opener = document.querySelector('.project-banner__gallery');
      var galleryClose = gallery && gallery.querySelector('.project-gallery__close');
      if (opener && gallery && gallery.hidden && opener.tagName !== 'A') {
        opener.addEventListener('click', openGallery);
      }
      if (galleryClose) {
        galleryClose.addEventListener('click', function () {
          closePhoto();
          closeGallery();
        });
      }
      box.querySelector('.project-lightbox__close').addEventListener('click', closePhoto);
      box.querySelector('.project-lightbox__nav--prev').addEventListener('click', function () {
        show(galleryState.index - 1);
      });
      box.querySelector('.project-lightbox__nav--next').addEventListener('click', function () {
        show(galleryState.index + 1);
      });
      if (download) {
        download.addEventListener('click', function () {
          if (!galleryState.unlocked || download.disabled) return;
          var photoId = download.dataset.photoId;
          if (!photoId) return;
          download.disabled = true;
          downloadFull([photoId])
            .catch(function () {})
            .finally(function () {
              download.disabled = !galleryState.unlocked;
            });
        });
      }
      box.addEventListener('click', function (event) {
        if (event.target === box) closePhoto();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
          if (box.hidden) return;
          if (event.key === 'ArrowRight') show(galleryState.index + 1);
          if (event.key === 'ArrowLeft') show(galleryState.index - 1);
          return;
        }
        if (!box.hidden) closePhoto();
        else if (gallery && !gallery.hidden && document.body.classList.contains('gallery-open')) closeGallery();
      });
    }
  };

  if (!document.querySelector('.project-gallery__grid[data-project-id]')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        window.initProjectGallery();
      });
    } else {
      window.initProjectGallery();
    }
  }
})();
