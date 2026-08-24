/* ==========================================================================
   SYSMIC — nav.js · Menú hamburguesa accesible
   --------------------------------------------------------------------------
   Vanilla JS, sin dependencias. Progressive enhancement:
   - Al ejecutarse marca <html class="js"> → CSS activa el modo colapsado.
   - Sin este archivo, el menú queda como lista estática usable (ver base.css).
   Comportamiento:
   - Click en .site-nav__toggle alterna body.nav-open + aria-expanded.
   - Escape cierra y devuelve el foco al botón.
   - Click fuera del nav cierra.
   - Volver al breakpoint desktop resetea el estado.
   ========================================================================== */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  function initNav() {
    var nav = document.querySelector('.site-nav');
    var toggle = document.querySelector('.site-nav__toggle');
    var menu = document.getElementById('nav-menu');

    if (!nav || !toggle || !menu) {
      return;
    }

    var toggleLabel = toggle.querySelector('.visually-hidden');

    function isOpen() {
      return document.body.classList.contains('nav-open');
    }

    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (toggleLabel) {
        toggleLabel.textContent = open ? 'Cerrar menú' : 'Abrir menú';
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!isOpen()) {
        return;
      }
      if (nav.contains(event.target)) {
        return;
      }
      setOpen(false);
    });

    var desktopQuery = window.matchMedia('(min-width: 769px)');
    function onBreakpointChange(event) {
      if (event.matches) {
        setOpen(false);
      }
    }
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', onBreakpointChange);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onBreakpointChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
