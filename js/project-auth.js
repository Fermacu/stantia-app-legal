(function () {
  var SESSION_KEY = 'stantia.webDownloadSessionId';
  var CODE_PREFIX = 'stantia.projectAccessCode.';
  var UNLOCK_PREFIX = 'stantia.projectUnlocked.';
  var APP_STORE_URL = 'https://apps.apple.com/app/stantia/id6790072749';
  var PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fermacu.stantia';
  var listeners = [];
  var ready = false;
  var authBound = false;
  var currentUser = null;
  var authError = '';
  var busy = false;
  var mountedProjectId = '';
  var mountedAccessMode = 'any_stantia_user';
  var lastNotifyKey = '';
  var welcomePrompted = false;

  function isEs() {
    return (document.documentElement.lang || '').toLowerCase().indexOf('es') === 0;
  }

  function t(en, es) {
    return isEs() ? es : en;
  }

  function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function getStoreUrl() {
    return isAndroidDevice() ? PLAY_STORE_URL : APP_STORE_URL;
  }

  function resolveAssetUrl(fileName) {
    var fromPage = document.querySelector('.brand__studio, .home-foot__logo, .brand__wordmark, link[rel="icon"]');
    var src = fromPage && (fromPage.getAttribute('src') || fromPage.getAttribute('href'));
    if (src) {
      return src.replace(/[^/]+(\?.*)?$/, fileName);
    }
    return '../../assets/' + fileName;
  }

  function syncUserFromAuth() {
    var auth = getAuth();
    if (!auth) return currentUser;
    currentUser = auth.currentUser || null;
    return currentUser;
  }

  function notify(force) {
    syncUserFromAuth();
    var state = getState();
    var key = [
      state.ready ? 1 : 0,
      state.user && state.user.uid ? state.user.uid : '',
      state.unlocked ? 1 : 0,
      state.accessMode,
      state.projectId,
      state.busy ? 1 : 0,
      state.error || '',
    ].join('|');
    renderUi();
    if (!force && key === lastNotifyKey) return;
    lastNotifyKey = key;
    listeners.forEach(function (fn) {
      try {
        fn(state);
      } catch (err) {}
    });
  }

  function getSessionId() {
    try {
      var existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch (err) {
      return 'sess_' + Date.now();
    }
  }

  function getAccessCode(projectId) {
    if (!projectId) return '';
    try {
      return sessionStorage.getItem(CODE_PREFIX + projectId) || '';
    } catch (err) {
      return '';
    }
  }

  function setAccessCode(projectId, code) {
    try {
      if (code) sessionStorage.setItem(CODE_PREFIX + projectId, code);
      else sessionStorage.removeItem(CODE_PREFIX + projectId);
    } catch (err) {}
  }

  function markUnlocked(projectId, unlocked) {
    try {
      if (unlocked) sessionStorage.setItem(UNLOCK_PREFIX + projectId, '1');
      else sessionStorage.removeItem(UNLOCK_PREFIX + projectId);
    } catch (err) {}
  }

  function hasUnlockFlag(projectId) {
    try {
      return sessionStorage.getItem(UNLOCK_PREFIX + projectId) === '1';
    } catch (err) {
      return false;
    }
  }

  function ensureFirebaseApp() {
    var config = window.STANTIA_FIREBASE;
    if (typeof firebase === 'undefined' || !config) return false;
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      return firebase.apps.length > 0;
    } catch (err) {
      return firebase.apps.length > 0;
    }
  }

  function getFunctions() {
    if (!ensureFirebaseApp() || !firebase.functions) return null;
    try {
      return firebase.functions();
    } catch (err) {
      return null;
    }
  }

  function getAuth() {
    if (!ensureFirebaseApp() || !firebase.auth) return null;
    try {
      return firebase.auth();
    } catch (err) {
      return null;
    }
  }

  function getState() {
    return {
      ready: ready,
      user: currentUser,
      sessionId: getSessionId(),
      accessMode: mountedAccessMode,
      projectId: mountedProjectId,
      unlocked: isUnlocked(mountedProjectId),
      busy: busy,
      error: authError,
    };
  }

  function isUnlocked(projectId) {
    if (!currentUser || !projectId) return false;
    if (asAccessModeFor(projectId) === 'any_stantia_user') return true;
    return hasUnlockFlag(projectId) && Boolean(getAccessCode(projectId));
  }

  var accessModeByProject = {};

  function asAccessModeFor(projectId) {
    if (projectId === mountedProjectId) return mountedAccessMode;
    return accessModeByProject[projectId] || 'any_stantia_user';
  }

  function ensureAccountMenu() {
    var existing = document.getElementById('stantia-project-account');
    if (existing) return existing;

    var account = document.createElement('div');
    account.id = 'stantia-project-account';
    account.className = 'project-account';
    account.innerHTML =
      '<button type="button" class="project-account__avatar" data-auth-avatar aria-haspopup="dialog" aria-expanded="false" aria-label="Account">' +
      '  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25" fill="currentColor"/><path fill="currentColor" d="M5.5 19.25c0-3.25 2.9-5.5 6.5-5.5s6.5 2.25 6.5 5.5v.25H5.5z"/></svg>' +
      '</button>' +
      '<div class="project-account__popover" data-auth-popover hidden role="dialog" aria-label="Account">' +
      '  <div class="project-account__guest" data-auth-guest>' +
      '    <p class="project-account__title" data-auth-popover-title></p>' +
      '    <p class="project-account__hint" data-auth-popover-hint></p>' +
      '    <form data-auth-form>' +
      '      <label><span data-auth-email-label></span><input type="email" name="email" required autocomplete="username" data-auth-email /></label>' +
      '      <label><span data-auth-password-label></span><input type="password" name="password" required autocomplete="current-password" data-auth-password /></label>' +
      '      <p class="project-auth__error" data-auth-form-error hidden></p>' +
      '      <button type="submit" class="project-auth__btn project-auth__btn--primary" data-auth-submit></button>' +
      '    </form>' +
      '  </div>' +
      '  <div class="project-account__user" data-auth-user hidden>' +
      '    <p class="project-account__title" data-auth-user-title></p>' +
      '    <p class="project-account__email" data-auth-user-email></p>' +
      '    <button type="button" class="project-auth__btn project-auth__btn--ghost" data-auth-logout></button>' +
      '  </div>' +
      '</div>';

    var actions = document.querySelector('.header-actions');
    if (actions) actions.appendChild(account);
    else document.body.appendChild(account);
    return account;
  }

  function ensureShell() {
    ensureAccountMenu();
    var existing = document.getElementById('stantia-project-auth');
    if (existing) return existing;

    var wrap = document.createElement('div');
    wrap.id = 'stantia-project-auth';
    wrap.className = 'project-auth';
    wrap.innerHTML =
      '<div class="project-auth__code" data-auth-code hidden>' +
      '  <p data-auth-code-copy></p>' +
      '  <form class="project-auth__code-form" data-auth-code-form>' +
      '    <input type="text" name="code" autocomplete="one-time-code" spellcheck="false" data-auth-code-input />' +
      '    <button type="submit" class="project-auth__btn project-auth__btn--primary" data-auth-code-submit></button>' +
      '  </form>' +
      '  <p class="project-auth__error" data-auth-code-error hidden></p>' +
      '</div>' +
      '<div class="project-auth__welcome" data-auth-welcome hidden>' +
      '  <div class="project-auth__welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="stantia-auth-welcome-title">' +
      '    <button type="button" class="project-auth__welcome-close" data-auth-welcome-close aria-label="Close">&times;</button>' +
      '    <p class="project-auth__eyebrow" data-auth-welcome-eyebrow></p>' +
      '    <h2 id="stantia-auth-welcome-title" data-auth-welcome-title></h2>' +
      '    <p data-auth-welcome-text></p>' +
      '    <a class="project-auth__app-card" data-auth-app-card href="' +
      getStoreUrl() +
      '" target="_blank" rel="noopener noreferrer">' +
      '      <span class="project-auth__app-icon" aria-hidden="true">' +
      '        <img data-auth-app-icon src="" alt="" />' +
      '      </span>' +
      '      <div class="project-auth__app-copy">' +
      '        <p class="project-auth__app-name">Stantia</p>' +
      '        <p class="project-auth__app-cta" data-auth-app-cta></p>' +
      '      </div>' +
      '      <span class="project-auth__app-chevron" aria-hidden="true">' +
      '        <svg viewBox="0 0 24 24">' +
      '          <path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M9.5 5.5 16 12l-6.5 6.5"/>' +
      '        </svg>' +
      '      </span>' +
      '    </a>' +
      '    <div class="project-auth__welcome-actions">' +
      '      <button type="button" class="project-auth__btn project-auth__btn--primary" data-auth-welcome-login></button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    var gallery = document.querySelector('.project-gallery');
    var facts = document.querySelector('.project-facts');
    if (facts && facts.parentNode) {
      facts.parentNode.insertBefore(wrap, facts.nextSibling);
    } else if (gallery && gallery.parentNode) {
      gallery.parentNode.insertBefore(wrap, gallery);
    } else {
      var main = document.querySelector('main') || document.body;
      main.appendChild(wrap);
    }

    bindShell();
    return wrap;
  }

  function closeWelcomeModal() {
    var welcome = document.querySelector('[data-auth-welcome]');
    if (welcome) welcome.hidden = true;
    document.body.classList.remove('auth-welcome-open');
  }

  function openWelcomeModal() {
    if (currentUser) return;
    ensureShell();
    var welcome = document.querySelector('[data-auth-welcome]');
    if (!welcome) return;
    welcome.hidden = false;
    document.body.classList.add('auth-welcome-open');
    renderUi();
  }

  function maybeOpenWelcome() {
    if (welcomePrompted || !ready || !mountedProjectId || currentUser) return;
    welcomePrompted = true;
    window.setTimeout(function () {
      if (!currentUser) openWelcomeModal();
    }, 250);
  }

  function closePopover() {
    var account = document.getElementById('stantia-project-account');
    if (!account) return;
    var popover = account.querySelector('[data-auth-popover]');
    var avatar = account.querySelector('[data-auth-avatar]');
    if (popover) popover.hidden = true;
    if (avatar) avatar.setAttribute('aria-expanded', 'false');
    account.classList.remove('is-open');
  }

  function openPopover() {
    ensureAccountMenu();
    bindShell();
    closeWelcomeModal();
    var account = document.getElementById('stantia-project-account');
    if (!account) return;
    var popover = account.querySelector('[data-auth-popover]');
    var avatar = account.querySelector('[data-auth-avatar]');
    var formError = account.querySelector('[data-auth-form-error]');
    if (formError && !authError) {
      formError.hidden = true;
      formError.textContent = '';
    }
    if (popover) popover.hidden = false;
    if (avatar) avatar.setAttribute('aria-expanded', 'true');
    account.classList.add('is-open');
    renderAccountUi(account);
  }

  function bindShell() {
    if (bindShell.done) return;
    bindShell.done = true;

    document.addEventListener('click', function (event) {
      var account = document.getElementById('stantia-project-account');
      if (!account || !account.classList.contains('is-open')) return;
      if (account.contains(event.target)) return;
      closePopover();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var welcome = document.querySelector('[data-auth-welcome]');
      if (welcome && !welcome.hidden) {
        closeWelcomeModal();
        return;
      }
      closePopover();
    });

    document.addEventListener('click', function (event) {
      var avatar = event.target.closest('[data-auth-avatar]');
      if (avatar) {
        var account = document.getElementById('stantia-project-account');
        if (account && account.classList.contains('is-open')) closePopover();
        else openLogin();
        return;
      }
      var loginBtn = event.target.closest('[data-auth-login], [data-auth-welcome-login]');
      if (loginBtn) {
        closeWelcomeModal();
        openLogin();
        return;
      }
      var dismissBtn = event.target.closest('[data-auth-welcome-close]');
      if (dismissBtn) {
        closeWelcomeModal();
        return;
      }
      var welcome = document.querySelector('[data-auth-welcome]');
      if (welcome && !welcome.hidden && event.target === welcome) {
        closeWelcomeModal();
        return;
      }
      var logoutBtn = event.target.closest('[data-auth-logout]');
      if (logoutBtn) {
        signOut().then(function () {
          closePopover();
        });
      }
    });

    document.addEventListener('submit', function (event) {
      var form = event.target.closest('[data-auth-form]');
      if (form) {
        event.preventDefault();
        var email = (form.querySelector('[data-auth-email]') || {}).value || '';
        var password = (form.querySelector('[data-auth-password]') || {}).value || '';
        signIn(email, password);
        return;
      }
      var codeForm = event.target.closest('[data-auth-code-form]');
      if (codeForm) {
        event.preventDefault();
        var input = codeForm.querySelector('[data-auth-code-input]');
        unlockWithCode(mountedProjectId, input ? input.value : '');
      }
    });
  }

  function openLogin() {
    authError = '';
    closeWelcomeModal();
    openPopover();
    var emailInput = document.querySelector('[data-auth-email]');
    if (emailInput && !currentUser) {
      window.setTimeout(function () {
        emailInput.focus();
      }, 30);
    }
  }

  function emailInitial(email) {
    var letter = String(email || '')
      .trim()
      .charAt(0)
      .toUpperCase();
    return /[A-Z0-9]/.test(letter) ? letter : 'S';
  }

  function setAvatarContent(avatarBtn, signedIn) {
    if (!avatarBtn) return;
    if (signedIn) {
      avatarBtn.innerHTML =
        '<span class="project-account__initial" aria-hidden="true">' +
        emailInitial(currentUser && currentUser.email) +
        '</span>';
      return;
    }
    avatarBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25" fill="currentColor"/><path fill="currentColor" d="M5.5 19.25c0-3.25 2.9-5.5 6.5-5.5s6.5 2.25 6.5 5.5v.25H5.5z"/></svg>';
  }

  function renderAccountUi(account) {
    if (!account) return;
    var guest = account.querySelector('[data-auth-guest]');
    var userBox = account.querySelector('[data-auth-user]');
    var avatarBtn = account.querySelector('[data-auth-avatar]');

    account.querySelector('[data-auth-popover-title]').textContent = t(
      'Stantia sign in',
      'Iniciar sesión en Stantia',
    );
    account.querySelector('[data-auth-popover-hint]').textContent = t(
      'Accounts are created only in the Stantia app.',
      'Las cuentas se crean solo en la app Stantia.',
    );
    account.querySelector('[data-auth-email-label]').textContent = t('Email', 'Correo');
    account.querySelector('[data-auth-password-label]').textContent = t('Password', 'Contraseña');
    account.querySelector('[data-auth-submit]').textContent = busy
      ? t('Signing in…', 'Entrando…')
      : t('Sign in', 'Iniciar sesión');
    account.querySelector('[data-auth-user-title]').textContent = t('Signed in', 'Sesión activa');
    account.querySelector('[data-auth-logout]').textContent = t('Sign out', 'Cerrar sesión');

    if (currentUser) {
      guest.hidden = true;
      guest.setAttribute('hidden', '');
      userBox.hidden = false;
      userBox.removeAttribute('hidden');
      account.querySelector('[data-auth-user-email]').textContent = currentUser.email || '';
      account.classList.add('is-signed-in');
      setAvatarContent(avatarBtn, true);
      if (avatarBtn) {
        avatarBtn.setAttribute(
          'aria-label',
          t('Account menu', 'Menú de cuenta') + (currentUser.email ? ': ' + currentUser.email : ''),
        );
      }
    } else {
      guest.hidden = false;
      guest.removeAttribute('hidden');
      userBox.hidden = true;
      userBox.setAttribute('hidden', '');
      account.querySelector('[data-auth-user-email]').textContent = '';
      account.classList.remove('is-signed-in');
      setAvatarContent(avatarBtn, false);
      if (avatarBtn) avatarBtn.setAttribute('aria-label', t('Sign in', 'Iniciar sesión'));
    }

    var formError = account.querySelector('[data-auth-form-error]');
    var popover = account.querySelector('[data-auth-popover]');
    if (formError) {
      if (authError && popover && !popover.hidden) {
        formError.hidden = false;
        formError.textContent = authError;
      } else if (!authError) {
        formError.hidden = true;
        formError.textContent = '';
      }
    }
  }

  function renderUi() {
    ensureAccountMenu();
    bindShell();
    renderAccountUi(document.getElementById('stantia-project-account'));
    document.body.classList.toggle('project-authed', Boolean(currentUser));

    if (!mountedProjectId) return;

    var root = ensureShell();
    var codeBox = root.querySelector('[data-auth-code]');
    var unlocked = isUnlocked(mountedProjectId);

    var eyebrow = t('Full-resolution photos', 'Fotografías en alta resolución');
    var title = t('Sign in with your Stantia account', 'Inicia sesión con tu cuenta Stantia');
    var text = t(
      'Sign in with your Stantia account to access full-resolution photos and download them for free.',
      'Inicie sesión con su cuenta de Stantia para acceder a las fotos en máxima resolución y poder descargarlas de forma gratuita.',
    );
    var loginLabel = t('Sign in', 'Iniciar sesión');

    root.querySelector('[data-auth-welcome-eyebrow]').textContent = eyebrow;
    root.querySelector('[data-auth-welcome-title]').textContent = title;
    root.querySelector('[data-auth-welcome-text]').textContent = text;
    root.querySelector('[data-auth-welcome-login]').textContent = loginLabel;
    root.querySelector('[data-auth-app-cta]').textContent = t(
      'Download the app for free',
      'Descarga la app gratis',
    );
    var appCard = root.querySelector('[data-auth-app-card]');
    if (appCard) {
      appCard.href = getStoreUrl();
      appCard.setAttribute(
        'aria-label',
        t('Download the Stantia app for free', 'Descarga la app Stantia gratis'),
      );
    }
    var appIcon = root.querySelector('[data-auth-app-icon]');
    if (appIcon && !appIcon.getAttribute('src')) {
      appIcon.src = resolveAssetUrl('logo-mark.png');
    }

    root.querySelector('[data-auth-code-copy]').textContent = t(
      'This gallery is invite-only. Enter the project code to unlock full downloads.',
      'Esta galería es solo para invitados. Ingresa el código del proyecto para desbloquear descargas.',
    );
    root.querySelector('[data-auth-code-input]').placeholder = t('Access code', 'Código de acceso');
    root.querySelector('[data-auth-code-submit]').textContent = busy
      ? t('Checking…', 'Verificando…')
      : t('Unlock', 'Desbloquear');

    var staleBanner = root.querySelector('[data-auth-banner]');
    if (staleBanner) staleBanner.remove();

    if (!currentUser) {
      codeBox.hidden = true;
      maybeOpenWelcome();
    } else {
      codeBox.hidden = !(mountedAccessMode === 'invite_only' && !unlocked);
      closeWelcomeModal();
    }

    document.body.classList.toggle('project-unlocked', unlocked);

    if (typeof window.setProjectGalleryAccess === 'function') {
      window.setProjectGalleryAccess({
        projectId: mountedProjectId,
        unlocked: unlocked,
      });
    }
  }

  function mountNavbar() {
    ensureAccountMenu();
    bindShell();
    notify(true);
  }

  function setSelectedCount(count) {
    // Cart badge lives in project-gallery.js.
    if (typeof window.setProjectCartCount === 'function') {
      window.setProjectCartCount(count);
    }
  }

  function applySignedInUi() {
    busy = false;
    authError = '';
    syncUserFromAuth();
    if (currentUser && mountedProjectId && mountedAccessMode === 'any_stantia_user') {
      markUnlocked(mountedProjectId, true);
    }
    closeWelcomeModal();
    closePopover();
    notify(true);
  }

  function signIn(email, password) {
    var auth = getAuth();
    if (!auth) {
      authError = t('Auth is unavailable.', 'La autenticación no está disponible.');
      notify(true);
      return Promise.reject(new Error('auth'));
    }
    busy = true;
    authError = '';
    notify(true);
    var emailValue = String(email || '').trim();
    var passwordValue = String(password || '');
    return auth
      .setPersistence(firebase.auth.Auth.Persistence.SESSION)
      .catch(function () {})
      .then(function () {
        return auth.signInWithEmailAndPassword(emailValue, passwordValue);
      })
      .then(function () {
        applySignedInUi();
      })
      .catch(function (err) {
        busy = false;
        var code = err && err.code ? String(err.code) : '';
        authError = t(
          'Could not sign in. Check your email and password, or create an account in the Stantia app.',
          'No se pudo iniciar sesión. Revisa correo y contraseña, o crea la cuenta en la app Stantia.',
        );
        if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
          authError = t(
            'No Stantia account found for that email. Download the app to create one.',
            'No hay una cuenta Stantia con ese correo. Descarga la app para crear una.',
          );
        } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          authError = t(
            'Wrong email or password.',
            'Correo o contraseña incorrectos.',
          );
        } else if (code === 'auth/too-many-requests') {
          authError = t(
            'Too many attempts. Try again later.',
            'Demasiados intentos. Prueba más tarde.',
          );
        } else if (code === 'auth/network-request-failed') {
          authError = t(
            'Network error. Check your connection.',
            'Error de red. Revisa tu conexión.',
          );
        }
        notify(true);
        openPopover();
        var formError = document.querySelector('[data-auth-form-error]');
        if (formError) {
          formError.hidden = false;
          formError.textContent = authError;
        }
      });
  }

  function signOut() {
    var auth = getAuth();
    if (!auth) return Promise.resolve();
    return auth.signOut().then(function () {
      if (mountedProjectId) {
        markUnlocked(mountedProjectId, false);
      }
      notify();
    });
  }

  function unlockWithCode(projectId, code) {
    var fns = getFunctions();
    var root = ensureShell();
    var codeError = root.querySelector('[data-auth-code-error]');
    if (!currentUser) {
      openLogin();
      return Promise.reject(new Error('auth'));
    }
    if (!fns) {
      if (codeError) {
        codeError.hidden = false;
        codeError.textContent = t('Functions unavailable.', 'Funciones no disponibles.');
      }
      return Promise.reject(new Error('functions'));
    }
    busy = true;
    notify();
    return fns
      .httpsCallable('unlockWebsiteProject')({
        projectId: projectId,
        accessCode: code,
      })
      .then(function () {
        setAccessCode(projectId, String(code || '').trim());
        markUnlocked(projectId, true);
        busy = false;
        if (codeError) {
          codeError.hidden = true;
          codeError.textContent = '';
        }
        notify();
      })
      .catch(function () {
        busy = false;
        markUnlocked(projectId, false);
        if (codeError) {
          codeError.hidden = false;
          codeError.textContent = t('Invalid access code.', 'Código de acceso inválido.');
        }
        notify();
      });
  }

  function getIdToken() {
    var user = currentUser || (getAuth() && getAuth().currentUser);
    if (!user || typeof user.getIdToken !== 'function') {
      return Promise.reject(new Error('auth'));
    }
    return user.getIdToken();
  }

  function photoFileEndpoint(projectId, photoId) {
    var project = (window.STANTIA_FIREBASE && window.STANTIA_FIREBASE.projectId) || 'hybrd-c05fe';
    var url =
      'https://us-central1-' +
      project +
      '.cloudfunctions.net/downloadWebsitePhotoFile?projectId=' +
      encodeURIComponent(projectId) +
      '&photoId=' +
      encodeURIComponent(photoId);
    var code = getAccessCode(projectId);
    if (code) url += '&accessCode=' + encodeURIComponent(code);
    return url;
  }

  function fetchPhotoBlob(projectId, photoId) {
    return getIdToken().then(function (token) {
      return fetch(photoFileEndpoint(projectId, photoId), {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
      }).then(function (res) {
        if (!res.ok) throw new Error('fetch-' + res.status);
        return res.blob();
      });
    });
  }

  function downloadPhotos(projectId, photoIds) {
    var fns = getFunctions();
    if (!currentUser) {
      openLogin();
      return Promise.reject(new Error('auth'));
    }
    if (!isUnlocked(projectId)) {
      return Promise.reject(new Error('locked'));
    }
    if (!fns) return Promise.reject(new Error('functions'));
    var ids = (photoIds || []).filter(function (id) {
      return typeof id === 'string' && id.trim();
    });
    if (!ids.length) return Promise.reject(new Error('missing'));
    var payload = {
      sessionId: getSessionId(),
      projectId: projectId,
      photoIds: ids,
    };
    var code = getAccessCode(projectId);
    if (code) payload.accessCode = code;
    return fns
      .httpsCallable('downloadWebsitePhotos')(payload)
      .then(function (result) {
        var data = (result && result.data) || {};
        var photos = data.photos || [];
        if (!photos.length && data.urls && data.urls.length) {
          photos = data.urls.map(function (item) {
            return { photoId: item.photoId, fileName: item.fileName };
          });
        }
        if (!photos.length) throw new Error('empty');
        return photos;
      })
      .catch(function (err) {
        var errCode = err && err.code ? String(err.code) : '';
        if (errCode.indexOf('permission-denied') !== -1) {
          markUnlocked(projectId, false);
          setAccessCode(projectId, '');
          notify();
        }
        throw err;
      });
  }

  function mount(projectId, accessMode) {
    mountedProjectId = projectId || '';
    mountedAccessMode = accessMode === 'invite_only' ? 'invite_only' : 'any_stantia_user';
    if (mountedProjectId) accessModeByProject[mountedProjectId] = mountedAccessMode;
    if (
      currentUser &&
      mountedAccessMode === 'any_stantia_user' &&
      mountedProjectId
    ) {
      markUnlocked(mountedProjectId, true);
    }
    ensureShell();
    notify();
  }

  function init() {
    if (!ensureFirebaseApp()) {
      ready = true;
      notify(true);
      return;
    }
    var auth = getAuth();
    if (!auth) {
      ready = true;
      notify(true);
      return;
    }
    if (authBound) {
      syncUserFromAuth();
      ready = true;
      notify(true);
      return;
    }
    authBound = true;
    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(function () {});
    auth.onAuthStateChanged(function (user) {
      currentUser = user || null;
      ready = true;
      if (
        user &&
        mountedProjectId &&
        mountedAccessMode === 'any_stantia_user'
      ) {
        markUnlocked(mountedProjectId, true);
      }
      if (!user && mountedProjectId) {
        markUnlocked(mountedProjectId, false);
      }
      notify(true);
    });
  }

  window.StantiaProjectAuth = {
    init: init,
    mount: mount,
    mountNavbar: mountNavbar,
    onChange: function (fn) {
      if (typeof fn === 'function') listeners.push(fn);
      return getState();
    },
    getState: getState,
    isUnlocked: isUnlocked,
    getSessionId: getSessionId,
    getAccessCode: getAccessCode,
    openLogin: openLogin,
    signIn: signIn,
    signOut: signOut,
    unlockWithCode: unlockWithCode,
    downloadPhotos: downloadPhotos,
    fetchPhotoBlob: fetchPhotoBlob,
    setSelectedCount: setSelectedCount,
  };

  // Bind as soon as this defer script runs, and again on DOMContentLoaded as a safety net.
  init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
