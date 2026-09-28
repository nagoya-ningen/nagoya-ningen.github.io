(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const closeMenu = () => { if (!toggle || !menu) return; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'メニューを開く'); menu.hidden = true; };
  toggle?.addEventListener('click', () => { const isOpen = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!isOpen)); toggle.setAttribute('aria-label', isOpen ? 'メニューを開く' : 'メニューを閉じる'); menu.hidden = isOpen; });
  menu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
  window.matchMedia('(min-width: 801px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
})();
