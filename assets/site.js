(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  let paused = false;
  let revealObserver;
  try { paused = sessionStorage.getItem('portfolio-motion') === 'paused'; } catch { /* Storage is optional. */ }
  function updateMotion() {
    const stopped = paused || reducedMotion.matches;
    root.classList.toggle('motion-paused', stopped);
    motionButton.hidden = reducedMotion.matches;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.querySelector('.motion-text').textContent = paused ? 'Resume motion' : 'Pause motion';
    motionButton.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
    if (stopped && revealObserver) {
      revealObserver.disconnect();
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    }
  }
  motionButton.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('portfolio-motion', paused ? 'paused' : 'running'); } catch { /* Storage is optional. */ }
    updateMotion();
  });
  reducedMotion.addEventListener('change', updateMotion);
  updateMotion();
  function closeMenu(restoreFocus = false) {
    root.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    root.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && root.classList.contains('menu-open')) closeMenu(true);
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  navigation.addEventListener('focusout', event => {
    if (!navigation.contains(event.relatedTarget) && event.relatedTarget !== menuButton) closeMenu();
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  if ('IntersectionObserver' in window) {
    if (!paused && !reducedMotion.matches) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.07 });
      document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
      root.classList.add('reveal-ready');
    }
    const animationObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
    });
    document.querySelectorAll('.project-art, .research-visual').forEach(element => animationObserver.observe(element));
    const navLinks = [...navigation.querySelectorAll('a')];
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) navLinks.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px' });
    document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
  }
  root.classList.add('js-ready');
})();
