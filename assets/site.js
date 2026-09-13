(() => {
  'use strict';
  const root = document.documentElement;
  const views = [...document.querySelectorAll('[data-view]')];
  const navigation = document.querySelector('#navigation');
  const sidebar = document.querySelector('#sidebar');
  const workspace = document.querySelector('.workspace');
  const menuButton = document.querySelector('#menu-toggle');
  const scrim = document.querySelector('#nav-scrim');
  const motionButton = document.querySelector('#motion-toggle');
  const themeButton = document.querySelector('#theme-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 960px)');
  history.scrollRestoration = 'manual';
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    const active = views.find(view => !view.hidden);
    active?.querySelector('h1,h2')?.focus();
  });
  const aliases = { home: 'overview', hero: 'overview', about: 'overview', work: 'projects', community: 'leadership', awards: 'leadership', volunteering: 'leadership', certifications: 'education', skills: 'education', gallery: 'overview', 'main-content': 'overview', main: 'overview' };
  let paused = false;
  let currentView;
  try {
    paused = sessionStorage.getItem('portfolio-motion') === 'paused';
    root.dataset.theme = localStorage.getItem('portfolio-theme') === 'light' ? 'light' : 'dark';
  } catch { root.dataset.theme = 'dark'; }

  function setMenu(open, restoreFocus = false) {
    open = open && compact.matches;
    root.classList.toggle('nav-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    scrim.hidden = !open;
    sidebar.inert = compact.matches && !open;
    workspace.inert = open;
    if (open) navigation.querySelector('[aria-current]')?.focus();
    else if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => setMenu(!root.classList.contains('nav-open'), true));
  scrim.addEventListener('click', () => setMenu(false, true));
  document.querySelector('#close-menu').addEventListener('click', () => setMenu(false, true));
  compact.addEventListener('change', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (!root.classList.contains('nav-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key === 'Tab') {
      const focusables = [...sidebar.querySelectorAll('a,button')].filter(el => el.offsetParent !== null);
      const first = focusables[0], last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  function route() {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
    const id = aliases[hash] || hash || 'overview';
    const active = views.find(view => view.id === id) || views[0];
    const changed = currentView && currentView !== active.id;
    views.forEach(view => { view.hidden = view !== active; });
    navigation.querySelectorAll('a').forEach(link => {
      if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.querySelector('#current-view').textContent = active.dataset.title;
    document.title = active.id === 'overview'
      ? 'Richmond Owusu Duah | Transportation Engineering'
      : `${active.dataset.title} | Richmond Owusu Duah`;
    currentView = active.id;
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (changed) {
      active.querySelector('h1,h2')?.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent('portfolio:view', { detail: { view: active.id } }));
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = link.hash.slice(1);
    if (!views.some(view => view.id === (aliases[target] || target))) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    route();
  });
  // Re-clicking the current section closes the mobile drawer too.
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')?.hash === `#${currentView}`) setMenu(false, true);
  });

  function updateTheme() {
    const light = root.dataset.theme === 'light';
    themeButton.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
    themeButton.querySelector('span').textContent = light ? 'Dark theme' : 'Light theme';
    document.querySelector('meta[name="theme-color"]').content = light ? '#f3f6fb' : '#0b1220';
  }
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('portfolio-theme', root.dataset.theme); } catch { /* Optional preference. */ }
    updateTheme();
  });
  function updateMotion() {
    const stopped = paused || reduced.matches;
    root.classList.toggle('motion-paused', stopped);
    motionButton.setAttribute('aria-pressed', String(stopped));
    motionButton.querySelector('use').setAttribute('href', `assets/icons.svg#${stopped ? 'play' : 'motion'}`);
    motionButton.querySelector('span').textContent = reduced.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
    motionButton.disabled = reduced.matches;
    document.dispatchEvent(new CustomEvent('portfolio:motion', { detail: { paused: stopped } }));
  }
  motionButton.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('portfolio-motion', paused ? 'paused' : 'running'); } catch { /* Optional preference. */ }
    updateMotion();
  });
  reduced.addEventListener('change', updateMotion);

  const filters = [...document.querySelectorAll('[data-project-filter]')];
  const cards = [...document.querySelectorAll('[data-project-category]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.projectFilter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let shown = 0;
    cards.forEach(card => {
      card.hidden = category !== 'all' && card.dataset.projectCategory !== category;
      if (!card.hidden) shown++;
    });
    document.querySelector('#project-count').textContent = `${shown} ${shown === 1 ? 'project' : 'projects'}`;
  }));
  root.classList.add('js-ready');
  updateTheme();
  updateMotion();
  route();
  setMenu(false);
})();
