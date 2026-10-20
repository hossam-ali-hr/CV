/* Hossam Aly — site behaviour (menu, year, section reveals). No dependencies. */
(function () {
  'use strict';

  /* Mobile navigation */
  var menuButton = document.querySelector('[data-menu-button]');
  var nav = document.querySelector('[data-nav]');
  if (menuButton && nav) {
    document.documentElement.classList.add('js-nav');
    var setMenuState = function (open, moveFocus) {
      nav.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel);
      if (open && moveFocus) {
        var firstLink = nav.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    };
    var closeMenu = function () {
      setMenuState(false, false);
    };
    menuButton.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      setMenuState(open, open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        closeMenu();
        menuButton.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !e.target.closest('.nav')) closeMenu();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880 && nav.classList.contains('open')) closeMenu();
    });
  }

  /* Current year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Subtle section reveals (respects prefers-reduced-motion) */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('[data-reveal]');
  if (!reduced && 'IntersectionObserver' in window && targets.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }
})();
