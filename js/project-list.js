(function () {
  var root = document.querySelector('[data-projects-list]');
  if (!root) return;

  var lang = (root.getAttribute('data-lang') || document.documentElement.lang || 'en').toLowerCase();
  var isEs = lang.indexOf('es') === 0;
  var basePath = root.getAttribute('data-base') || './';
  var fallbackHtml = root.innerHTML;
  var seeLabel = isEs ? 'Ver proyecto' : 'See project';

  var SPORT_SVG =
    '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M255.233 61.009c-64.986-.549-141.156 21.77-232.77 86.17-2.124 1.136-2.856 1.77-3.663 2.576-.33 22.087.053 44.195.169 66.287 41.134 25.308 100.629 45.815 141.87 55.242-40.006 54.984-65.757 112.762-84.793 169.274l-1.916 5.685 49.586 43.473 5.185-10.524c29.919-60.708 55.189-122.456 94.832-179.1 7.43 6.226 16.197 11.95 27.217 11.128 5.455-.407 9.59-2.521 12.97-5.264l3.835.158c11.196.46 22.125-.34 32.049-3.79a49.45 49.45 0 0 0 8.133-3.678c42.982 51.203 65.056 121.754 80.294 177.52L392.286 491l57.81-57.041-2.197-5.54c-18.928-47.699-37.653-110.49-75.439-159.839 40.2-10.794 76.734-27.318 108.326-48.125 10.64-7.01 5.245-3.447 12.545-8.617l-1.523-61.74c-4.272-2.654-6.305-3.658-10.121-5.711-51.467-27.684-109.288-67.177-183.198-79.582a274.737 274.737 0 0 0-43.256-3.797zm-.246 17.928c14.062.15 27.542 1.442 40.524 3.62 67.167 11.274 121.501 46.976 172.842 75.005a503.254 503.254 0 0 1-29.192 14.488c-47.152-28.78-98.154-53.407-155.365-61.158-65.292-8.846-138.118 4.926-220.31 58.205a543.237 543.237 0 0 1-23.938-11.77c86.261-59.175 156.057-79.026 215.44-78.39zm-7.904 47.414c11.676.03 23.1.861 34.297 2.379 49.283 6.676 94.541 27.006 137.357 52.07-32.065 12.873-64.881 21.975-98.205 27.137-11.926-13.686-29.01-19.083-45.847-21.202l-6.223-.783-2.678 5.158c-4.595-1.936-9.467-3.954-13.637-5.341-4.337-1.431-8.07-2.662-12.86-2.489-20.419.738-33.221 9.61-39.604 18.715a39.044 39.044 0 0 0-3.79 6.768c-37.4-5.266-75.052-15.524-112.64-31.02 60.545-37.301 114.452-51.519 163.83-51.392zm227.695 47.941l.412 28.092c-32.966 22.502-72.037 40.144-115.548 50.844-8.333-9.135-17.5-17.615-27.637-25.235a61.999 61.999 0 0 0-1.51-3.892c49.566-8.454 97.963-25.23 144.283-49.809zM37.28 176.136c51.963 26.354 104.52 42.826 156.705 50.045.378.937.805 1.83 1.278 2.685a523.56 523.56 0 0 0-22.407 26.557c-43.916-9.01-89.474-24.845-135.705-48.79zm202.655 25.133c6.402.16 12.565 3.704 18.41 6.23-5.139 13.292-8.162 26.81-8.768 40.436l-.197-.114c-10.532-6.134-20.484-12.486-27.77-18.084-6.358-4.884-9.695-9.368-10.482-10.23 4.78-15.415 20.1-18.32 28.807-18.238zm38.837 4.468c13.956 2.53 24.72 7.36 31.807 18.955 5.731 9.378 7.181 16.926 6.49 24.577-.69 7.65-3.859 15.669-8.695 24.521-3.136 5.741-7.719 9.18-14.48 11.531-5.384 1.872-12.125 2.76-19.575 2.858-10.934-27.996-8.57-54.647 4.453-82.442zm-70.921 36.123c8.06 6.246 17.296 12.368 24.832 16.97-52.939 63.648-82.216 134.28-114.86 201.782l-22.718-19.92c23.312-67.678 56.371-135.958 112.746-198.832zm126.796 11.948c49.11 45.588 71.791 117.736 94.38 175.654l-27.58 27.215c-15.266-53.999-37.48-119.539-80.067-169.881a39.932 39.932 0 0 0 2.789-4.377c4.943-9.049 9.026-18.417 10.478-28.611zm-86.236 14.187c.743.416 1.478.812 2.219 1.223.946 6.517 2.485 13.044 4.633 19.568-3.104 2.783-6.077 4.514-5.65 4.483-1.92.143-8.738-3.091-15.14-7.893a436.419 436.419 0 0 1 13.938-17.38z"/></svg>';
  var PIN_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a7 7 0 0 0-7 7c0 5.25 7 12.6 7 12.6s7-7.35 7-12.6a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>';

  function pick(data, enKey, esKey) {
    if (isEs) {
      var es = data[esKey];
      if (typeof es === 'string' && es.trim()) return es.trim();
    }
    var en = data[enKey];
    return typeof en === 'string' ? en.trim() : '';
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function projectHref(id) {
    if (id === 'liga-bjj') return basePath + 'liga-bjj/';
    return basePath + 'view/?id=' + encodeURIComponent(id);
  }

  function renderProjects(projects) {
    if (!projects.length) {
      root.innerHTML = fallbackHtml;
      return;
    }
    var html = '';
    projects.forEach(function (item) {
      var data = item.data;
      var title = pick(data, 'title', 'titleEs') || item.id;
      var subtitle = pick(data, 'subtitle', 'subtitleEs');
      var sport = pick(data, 'sport', 'sportEs');
      var location = pick(data, 'location', 'locationEs');
      var cover = typeof data.coverUrl === 'string' ? data.coverUrl : '';
      var href = projectHref(item.id);
      html += '<section class="home-work" aria-label="' + escapeAttr(title) + '">';
      html += '<a class="home-work__banner" href="' + escapeAttr(href) + '">';
      if (cover) {
        html += '<img class="home-work__photo" src="' + escapeAttr(cover) + '" alt="" loading="lazy" />';
      } else {
        html += '<div class="home-work__photo project-list__cover-empty" aria-hidden="true"></div>';
      }
      if (sport || location) {
        html += '<div class="project-banner__chips">';
        if (sport) {
          html +=
            '<span class="project-chip project-chip--sport">' +
            SPORT_SVG +
            ' ' +
            escapeHtml(sport) +
            '</span>';
        }
        if (location) {
          html += '<span class="project-chip">' + PIN_SVG + ' ' + escapeHtml(location) + '</span>';
        }
        html += '</div>';
      }
      html += '<div class="home-work__copy">';
      html += '<h2 class="home-work__event">' + escapeHtml(title) + '</h2>';
      if (subtitle) html += '<p class="home-work__sub">' + escapeHtml(subtitle) + '</p>';
      html +=
        '<span class="project-banner__gallery">' +
        escapeHtml(seeLabel) +
        ' <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
      html += '</div></a></section>';
    });
    root.innerHTML = html;
  }

  root.setAttribute('aria-busy', 'true');
  root.innerHTML =
    '<div class="project-list__loading" aria-hidden="true"><span></span><span></span></div>';

  var config = window.STANTIA_FIREBASE;
  if (!config || typeof firebase === 'undefined') {
    root.innerHTML = fallbackHtml;
    root.removeAttribute('aria-busy');
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(config);
    firebase
      .firestore()
      .collection('websiteProjects')
      .get()
      .then(function (snap) {
        var projects = [];
        snap.forEach(function (doc) {
          var data = doc.data() || {};
          if (data.published === false) return;
          projects.push({ id: doc.id, data: data });
        });
        projects.sort(function (a, b) {
          return Number(a.data.order || 0) - Number(b.data.order || 0);
        });
        renderProjects(projects);
        root.removeAttribute('aria-busy');
      })
      .catch(function () {
        root.innerHTML = fallbackHtml;
        root.removeAttribute('aria-busy');
      });
  } catch (err) {
    root.innerHTML = fallbackHtml;
    root.removeAttribute('aria-busy');
  }
})();
