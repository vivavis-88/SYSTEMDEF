/* App shell for server-rendered pages: sliding nav highlight, theme switch,
   sidebar collapse and toast. Every part is skipped if its element is missing,
   so it is safe to load on the login pages too. */
(function () {
  'use strict';

  var root = document.documentElement;
  var RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches);
  var NS = 'http://www.w3.org/2000/svg';

  function $(id) { return document.getElementById(id); }
  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function sget(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  /* ---------- toast ---------- */
  function toast(msg, isErr) {
    var t = $('toast');
    if (!t || !msg) return;
    t.textContent = '';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'i');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#' + (isErr ? 'warn' : 'ok'));
    svg.appendChild(use);
    var span = document.createElement('span');
    span.textContent = msg;               // textContent: never HTML
    t.appendChild(svg);
    t.appendChild(span);
    t.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.className = ''; }, isErr ? 4000 : 2400);
  }

  /* ---------- sliding highlight (the white pill) ----------
     Each page load is a new page, so the pill remembers where it was on the
     previous page (sessionStorage) and glides from there to the new tab. */
  function slider(el, key) {
    if (!el) return;
    var ind = document.createElement('span');
    ind.className = 'ind';
    el.insertBefore(ind, el.firstChild);

    var cur = null;
    function geo() {
      var on = el.querySelector('.on');
      return on ? { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight } : null;
    }
    function same(a, b) { return a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h; }
    function paint(g) {
      ind.style.width = g.w + 'px';
      ind.style.height = g.h + 'px';
      ind.style.transform = 'translate(' + g.x + 'px,' + g.y + 'px)';
    }
    function snap(g) {                     // jump without animating
      ind.style.opacity = '';
      ind.style.transition = 'none';
      paint(g);
      void ind.offsetWidth;
      ind.style.transition = '';
      cur = g; sset(key, g);
    }
    function resnap() {                    // layout changed (resize, collapse, fonts)
      var g = geo();
      if (!g) { ind.style.opacity = '0'; return; }
      if (!same(g, cur)) snap(g);
    }

    var g = geo();
    if (!g) { ind.style.opacity = '0'; }
    else {
      var prev = sget(key);
      if (prev && !RM && !same(prev, g)) {
        ind.style.transition = 'none';
        paint(prev);
        void ind.offsetWidth;
        ind.style.transition = '';
        paint(g);                          // glide from the old tab to the new one
        cur = g; sset(key, g);
      } else {
        snap(g);
      }
    }
    if (window.ResizeObserver) new ResizeObserver(resnap).observe(el);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resnap);
    window.addEventListener('resize', resnap);
  }

  /* ---------- sidebar collapse ---------- */
  function collapse() {
    var btn = document.querySelector('button#collapse'), app = $('app');
    if (!btn || !app) return;
    if (root.classList.contains('nav-c')) app.classList.add('c');
    btn.addEventListener('click', function () {
      var c = app.classList.toggle('c');
      root.classList.toggle('nav-c', c);
      lset('app_nav_c', c ? '1' : '0');
    });
  }

  /* ---------- theme: dark -> light -> sand ---------- */
  function theme() {
    var btn = document.querySelector('button#theme'), TH = ['dark', 'light', 'sand'];
    if (!btn) return;
    btn.addEventListener('click', function () {
      var i = (TH.indexOf(root.dataset.theme) + 1) % TH.length;
      root.dataset.theme = TH[i];
      lset('app_theme', TH[i]);
      var icon = btn.firstElementChild;
      if (icon) icon.style.transform = 'rotate(' + (i * 120) + 'deg)';
      toast('Theme: ' + TH[i]);
    });
  }

  function init() {
    slider($('tabs'), 'nav_ind');
    slider($('day'), 'day_ind');
    collapse();
    theme();
    var t = $('toast');                     // message set by the server (flash)
    if (t && t.getAttribute('data-flash')) {
      var msg = t.getAttribute('data-flash'), err = t.getAttribute('data-type') === 'error';
      setTimeout(function () { toast(msg, err); }, 80);
    }
  }

  window.Shell = { toast: toast };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();