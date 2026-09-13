(() => {
  'use strict';
  const root = document.documentElement;
  const overviewTitle = document.title;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const overviewDescription = descriptionMeta.content;
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
    if (open) navigation.querySelector('[aria-current]')?.focus({ preventScroll: true });
    else if (restoreFocus) menuButton.focus({ preventScroll: true });
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

  const scrollPositions = new Map();
  let currentHash;
  let handledURL;
  function resolveTarget(hash) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { id = ''; }
    return document.getElementById(aliases[id] || id || 'overview');
  }
  function route({ restore = false, initial = false } = {}) {
    if (currentHash !== undefined) scrollPositions.set(currentHash, window.scrollY);
    const target = resolveTarget(location.hash);
    const active = target?.closest('[data-view]') || views[0];
    const changed = currentView !== active.id;
    if (target?.matches('[data-project-category]')) {
      searchInput.value = '';
      selectedCategory = 'all';
      applyFilters();
      target.querySelector('details').open = true;
    }
    views.forEach(view => {
      view.hidden = view !== active;
      view.classList.remove('view-enter');
    });
    navigation.querySelectorAll('a').forEach(link => {
      if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.querySelector('#current-view').textContent = active.dataset.label || active.dataset.title;
    const projectHeading = target?.matches('.project-card') ? target.querySelector('h2')?.textContent.trim() : null;
    document.title = active.id === 'overview' ? overviewTitle : `${projectHeading || active.dataset.title} | Richmond Owusu Duah`;
    const viewDescription = projectHeading
      ? target.querySelector('.project-body > p:not(.project-location)')?.textContent
      : active.dataset.description || active.querySelector('.page-heading > p:last-child')?.textContent;
    descriptionMeta.content = active.id === 'overview' ? overviewDescription : (viewDescription || overviewDescription).replace(/\s+/g, ' ').trim();
    currentView = active.id;
    currentHash = location.hash;
    handledURL = location.href;
    setMenu(false);
    if (changed && !initial) active.classList.add('view-enter');
    const detailTarget = target && target !== active && active.contains(target) ? target : null;
    const heading = (detailTarget || active).querySelector('h1,h2,h3');
    if (!initial || detailTarget) heading?.focus({ preventScroll: true });
    if (restore && scrollPositions.has(currentHash)) {
      window.scrollTo({ top: scrollPositions.get(currentHash), behavior: 'instant' });
    } else if (detailTarget) {
      detailTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else window.scrollTo({ top: 0, behavior: 'instant' });
    document.dispatchEvent(new CustomEvent('portfolio:view', { detail: { view: active.id } }));
  }
  window.addEventListener('popstate', () => route({ restore: true }));
  window.addEventListener('hashchange', () => {
    // History navigation also emits hashchange; handle it only once.
    if (handledURL !== location.href) route();
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!resolveTarget(link.hash)?.closest('[data-view]')) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    route();
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
  const searchInput = document.querySelector('#project-search');
  const clearSearch = document.querySelector('#clear-search');
  const register = document.querySelector('#project-register');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '');
  const projectText = new Map(cards.map(card => [card, normalize(card.textContent)]));
  let selectedCategory = 'all';
  let registerWasOpen = false;
  let filtering = false;

  function applyFilters() {
    const tokens = normalize(searchInput.value).trim().split(/\s+/).filter(Boolean);
    const activeFilter = tokens.length > 0 || selectedCategory !== 'all';
    if (activeFilter && !filtering) registerWasOpen = register.open;
    let featured = 0, additional = 0;
    cards.forEach(card => {
      const categoryMatch = selectedCategory === 'all' || card.dataset.projectCategory === selectedCategory;
      const textMatch = tokens.every(token => projectText.get(card).includes(token));
      card.hidden = !categoryMatch || !textMatch;
      if (!card.hidden) {
        if (card.classList.contains('project-card')) featured++;
        else additional++;
      }
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectFilter === selectedCategory)));
    const count = featured + additional;
    document.querySelector('#project-count').textContent = `${count} ${count === 1 ? 'assignment' : 'assignments'} · ${featured} featured · ${additional} additional`;
    document.querySelector('#register-count').textContent = `${additional} additional ${additional === 1 ? 'assignment' : 'assignments'} in development review, parking, access, and transportation planning.`;
    document.querySelector('#project-empty').hidden = count > 0;
    document.querySelector('#project-results').hidden = featured === 0;
    register.hidden = additional === 0;
    if (activeFilter) register.open = additional > 0;
    else if (filtering) register.open = registerWasOpen;
    clearSearch.hidden = searchInput.value.length === 0;
    filtering = activeFilter;
  }
  filters.forEach(button => button.addEventListener('click', () => {
    selectedCategory = button.dataset.projectFilter;
    applyFilters();
  }));
  searchInput.addEventListener('input', applyFilters);
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
    searchInput.focus();
  });
  root.classList.add('js-ready');
  updateTheme();
  updateMotion();
  route({ initial: true });
  setMenu(false);
})();
