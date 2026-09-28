(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  const label = toggle?.querySelector('.motion-toggle-label');
  const icon = toggle?.querySelector('.motion-toggle-icon');
  let userPaused = false;
  try { userPaused = sessionStorage.getItem('nagoya-motion-paused') === 'true'; } catch { /* Storage is optional. */ }
  let observer;
  const targets = [...document.querySelectorAll('.section-label,.about-intro>h2,.about-body,.principles>div,.section-heading,.story,.more-stories,.lab-identity,.lab-copy,.lab-project-heading,.project,.annai-link,.newsletter-copy,.newsletter-graphic,.news-heading,.news-list,.footer-signature')];

  function setMotion() {
    const paused = userPaused || reduceMotion.matches;
    root.dataset.motion = paused ? 'paused' : 'running';
    if (toggle) {
      toggle.hidden = false;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.disabled = reduceMotion.matches;
      label.textContent = reduceMotion.matches ? '動きを減らして表示中' : paused ? '動きを再生' : '動きを止める';
      icon.textContent = paused ? '▷' : 'Ⅱ';
    }
    if (paused) {
      targets.forEach(el => { el.classList.remove('reveal-pending'); el.classList.add('is-revealed'); });
      observer?.disconnect();
    }
  }

  setMotion();
  root.dataset.pageVisible = String(!document.hidden);
  root.classList.add('motion-ready');
  toggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    try { sessionStorage.setItem('nagoya-motion-paused', String(userPaused)); } catch { /* Keep in-memory preference. */ }
    setMotion();
  });
  reduceMotion.addEventListener('change', setMotion);
  document.addEventListener('visibilitychange', () => { root.dataset.pageVisible = String(!document.hidden); });

  // One-time entrances. Content remains visible if IntersectionObserver is unavailable.
  if ('IntersectionObserver' in window && root.dataset.motion === 'running') {
    observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.remove('reveal-pending');
        target.classList.add('is-revealed');
        observer.unobserve(target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -22px 0px' });
    targets.forEach(el => {
      el.classList.add('reveal-target');
      if (el.getBoundingClientRect().top >= window.innerHeight) el.classList.add('reveal-pending');
      const group = el.closest('.stories-grid,.projects-grid,.principles');
      if (group) el.style.setProperty('--reveal-delay', `${Math.min([...group.children].indexOf(el), 2) * 90}ms`);
      observer.observe(el);
    });
  }

  // Stop perpetual artwork while offscreen; no animation frame loop or scroll hijacking.
  if ('IntersectionObserver' in window) {
    const zones = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => target.classList.toggle('motion-outside', !isIntersecting));
    }, { rootMargin: '70px 0px' });
    document.querySelectorAll('.motion-reel,.kinetic-band').forEach(el => zones.observe(el));
  }
  const headerObserver = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
    root.classList.toggle('has-scrolled', !entry.isIntersecting);
  }) : null;
  const sentinel = document.querySelector('.hero-topline');
  if (sentinel) headerObserver?.observe(sentinel);
})();
