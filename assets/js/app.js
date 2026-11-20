/* AMAYA Booth - user interface. Works with api.php (shared on the local network) or falls back to this device's localStorage. */
(function () {
  'use strict';
  /* js/fx.js adds animations + sound. If it is missing, the app still works, just without them. */
  var FX = window.FX || { soundOn: function () { return false; }, setSound: function () { }, roll: function () { }, forget: function () { }, pop: function () { },
    count: function (el, k, to, fmt) { if (el) el.innerHTML = fmt(to); } };
  var KEY = 'amaya_booth_v1';
  var S = null;
  var ui = { cat: '', itemCat: '', newCat: '', tab: 'sell', day: 1, scope: 1, sel: null, q: '', qty: 1, price: '', user: null, stagger: true, flash: false, animTab: true };
  var SESSION = 'amaya_session';
  var CASHIER_TABS = ['sell', 'sales', 'sheet'];
  function allowed(t) { return ui.user && (ui.user.role === 'admin' || CASHIER_TABS.indexOf(t) >= 0); }
  function isAdmin() { return ui.user && ui.user.role === 'admin'; }
  function canDelete(x) { return isAdmin() || (ui.user && x.cashier === ui.user.name); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var TABS = [['home', 'Overview', 'home'], ['sell', 'Sell', 'sell'], ['items', 'Items', 'items'], ['sales', 'Sales log', 'log'], ['sheet', 'Sheet', 'sheet'], ['payout', 'Payout', 'pay'], ['export', 'Export', 'exp'], ['settings', 'Settings', 'set']];
  var $ = function (id) { return document.getElementById(id); };
  var money = Core.money;
  function mny(v, short) { var a = money(v); if (short) a = a.replace('.00', ''); return '<span class="mny"><i>P</i>' + a + '</span>'; }
  function pmh(v) { return '<span class="mny"><i>P</i>' + Math.round(v).toLocaleString('en-PH') + '</span>'; }
  function qn(v) { return '<span class="qn">' + v + '</span>'; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, err) { var t = $('toast'); t.innerHTML = '<svg class="i"><use href="#' + (err ? 'warn' : 'ok') + '"/></svg><span></span>'; t.lastChild.textContent = msg; t.className = 'show' + (err ? ' err' : ''); clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ''; }, 2400); }

  /* ---------- storage: server (api.php) or local ---------- */
  var Store = {
    mode: 'local',
    init: function () {
      var self = this;
      return fetch('api.php', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
        if (!j || !Array.isArray(j.items)) throw 0; self.mode = 'server'; return j;
      }).catch(function () { self.mode = 'local'; return self.loadLocal(); });
    },
    loadLocal: function () { try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { } return Core.emptyState(); },
    call: function (op, data) {
      if (this.mode === 'server') {
        return fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: op, data: data }) })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Server error'); return j; }); });
      }
      return new Promise(function (res, rej) {
        try { var s = Store.loadLocal(); Core.applyOp(s, op, data); localStorage.setItem(KEY, JSON.stringify(s)); res(s); } catch (e) { rej(e); }
      });
    },
    poll: function () { return fetch('api.php', { cache: 'no-store' }).then(function (r) { return r.json(); }); }
  };

  function act(op, data, okMsg) {
    return Store.call(op, data).then(function (s) { S = s; if (okMsg) toast(okMsg); return s; })
      .catch(function (e) { toast(e.message || 'Something went wrong', true); throw e; });
  }

  /* ---------- helpers ---------- */
  function catMap() { var m = {}; (S.categories || []).forEach(function (c) { m[c.id] = c; }); return m; }
  function inkFor(hex) { var n = parseInt(String(hex).slice(1), 16) || 0, r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#1d1630' : '#ffffff'; }
  function catPill(id) { var c = catMap()[id]; return c ? '<span class="cpill" style="--cc:' + c.color + '">' + esc(c.name) + '</span>' : ''; }
  function catOptions(sel, none) { return '<option value="">' + (none || 'No category') + '</option>' + (S.categories || []).map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); }
  function owners() { var seen = {}, out = []; S.items.forEach(function (i) { var k = i.owner.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(i.owner); } }); return out; }
  function scopeSelect() {
    var h = '<select class="f" data-scope style="max-width:240px">';
    for (var d = 1; d <= Core.numDays(S); d++) h += '<option value="' + d + '"' + (String(ui.scope) === String(d) ? ' selected' : '') + '>' + esc(Core.scopeLabel(S, d)) + '</option>';
    h += '<option value="all"' + (ui.scope === 'all' ? ' selected' : '') + '>All days</option></select>';
    return h;
  }
  function stat(label, val) { return '<div class="stat"><span>' + label + '</span><b>' + val + '</b></div>'; }
  function dl(name, data, type) {
    var b = new Blob([data], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  /* ---------- shell ---------- */
  /* ---------- motion helpers ---------- */
  var RM = matchMedia('(prefers-reduced-motion:reduce)').matches, tk = {}, HV = {}, HC = [], HM = 1, HP = {}, PT = [], CUR = [], HL = [];
  function ic(n) { return '<svg class="i"><use href="#' + n + '"/></svg>'; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function tween(key, dur, fn) { var id = tk[key] = (tk[key] || 0) + 1, t0 = performance.now(); dur = RM ? 1 : dur; (function f(n) { if (tk[key] !== id) return; var t = Math.min(1, (n - t0) / dur); fn(ease(t)); if (t < 1) requestAnimationFrame(f); })(t0); }
  function num(el, key, to, fmt) { if (!el) return; var from = HV[key] || 0; HV[key] = to; tween(key, 600, function (e) { el.innerHTML = fmt(from + (to - from) * e); }); }
  function pm(v) { return 'P' + Math.round(v).toLocaleString('en-PH'); }
  /* a bar of buttons with one sliding highlight; the buttons are only rebuilt when they change */
  function place(el) {
    var b = el.querySelector('button.on'), i = el._i; if (!b || !i) return;
    if (el._snap) i.style.transition = 'none';
    i.style.width = b.offsetWidth + 'px'; i.style.height = b.offsetHeight + 'px'; i.style.transform = 'translate(' + b.offsetLeft + 'px,' + b.offsetTop + 'px)';
    if (el._snap) { void i.offsetWidth; i.style.transition = ''; el._snap = 0; }
  }
  function bar(el, items, active, attr) {
    var h = items.map(function (x) { return '<button ' + attr + '="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    if (el._h !== h) { el._h = h; el.innerHTML = h; var i = el._i || (el._i = document.createElement('span')); i.className = 'ind'; el.insertBefore(i, el.firstChild); el._snap = 1; }
    [].forEach.call(el.querySelectorAll('button'), function (b) { b.classList.toggle('on', b.getAttribute(attr) === String(active)); });
    place(el);
  }
  function snapBars() { ['tabs', 'day'].forEach(function (id) { $(id)._snap = 1; place($(id)); }); }

  /* ---------- shell ---------- */
  function renderShell() {
    $('title').textContent = S.settings.eventName || 'AMAYA Booth';
    document.title = $('title').textContent + ' - Sales';
    var m = $('mode');
    m.textContent = Store.mode === 'server' ? 'Shared (server)' : 'This device only';
    m.className = 'badge ' + (Store.mode === 'server' ? 'ok' : 'local');
    if (ui.day > Core.numDays(S)) ui.day = Core.numDays(S);
    $('greet').textContent = ui.user ? 'Hello, ' + ui.user.name : '';
    $('sub').textContent = Core.scopeLabel(S, ui.day);
    var ds = []; for (var i = 1; i <= Core.numDays(S); i++) ds.push([i, 'Day ' + i]);
    bar($('day'), ds, ui.day, 'data-d');
    $('who').innerHTML = ui.user ? esc(ui.user.role) + ' <button data-logout>Log out</button>' : '';
    bar($('tabs'), TABS.filter(function (t) { return allowed(t[0]); }).map(function (t) { return [t[0], ic(t[2]) + '<span class="lbl">' + t[1] + '</span>']; }), ui.tab, 'data-tab');
  }

  /* ---------- OVERVIEW (admin) ---------- */
  function hrLabel(h) { return (h % 12 || 12) + (h < 12 ? 'am' : 'pm'); }
  function homeData() {
    var d = ui.day, xs = Core.scopeSales(S, d), p = Core.payout(S, d), q = 0, hrs = {}, h0 = 9, h1 = 17;
    xs.forEach(function (x) { q += x.qty; var h = new Date(x.ts).getHours(); hrs[h] = (hrs[h] || 0) + x.total; if (h < h0) h0 = h; if (h > h1) h1 = h; });
    var lab = [], val = []; for (var h = h0; h <= h1; h++) { lab.push(h); val.push(hrs[h] || 0); }
    return { xs: xs, p: p, q: q, lab: lab, val: val, t: p.total.sales };
  }
  function viewHome() {
    return '<div class="grid">' +
      '<div class="stat"><div class="k">Sales</div><div class="v" id="hs1"></div><span class="d" id="hd1"></span></div>' +
      '<div class="stat"><div class="k">Items sold</div><div class="v" id="hs2"></div><span class="k" id="hd2"></span></div>' +
      '<div class="stat"><div class="k">Owners’ payout</div><div class="v" id="hs3"></div><span class="k" id="hd3"></span></div>' +
      '<div class="stat inv"><div class="k">AMAYA income</div><div class="v" id="hs4"></div><span class="k">Booths and share</span></div>' +
      '<div class="card sum"><div><p class="muted" id="hdate"></p><p class="head" id="hline"></p></div><div class="hl"><div><span class="k">Peak hour</span><b id="hh1"></b><small id="hh1s"></small></div><div><span class="k">Top item</span><b id="hh2"></b><small id="hh2s"></small></div><div><span class="k">Leading category</span><b id="hh3"></b><small id="hh3s"></small></div></div></div>' +
      '<div class="card s2"><h2>Sales by hour</h2><div class="chart" id="hchart"></div></div>' +
      '<div class="card"><h2>By category</h2><div id="hcats"></div></div>' +
      '<div class="card"><h2>Owner payouts</h2><div id="hpay"></div></div>' +
      '<div class="card s2"><h2>Recent sales</h2><div id="hrec"></div></div>' +
      '<div class="card s2"><h2>Stock left</h2><div id="hstock"></div></div></div>';
  }
  function homeFill() {
    var D = homeData(), d = ui.day, p = D.p, prev = d > 1 ? Core.payout(S, d - 1).total.sales : null;
    num($('hs1'), 'hs1', D.t, pmh); num($('hs2'), 'hs2', D.q, function (v) { return Math.round(v); }); num($('hs3'), 'hs3', p.total.owners, pmh); num($('hs4'), 'hs4', p.total.amaya, pmh);
    var dl = $('hd1'), pc = prev > 0 ? Math.round(Math.abs(D.t - prev) / prev * 100) : 0;
    dl.textContent = prev > 0 ? (D.t >= prev ? '+' : '−') + pc + '% vs. Day ' + (d - 1) : d === 1 ? 'Opening day' : 'Day ' + d; dl.className = 'd' + (prev > 0 && D.t < prev ? ' n' : '');
    $('hd2').textContent = D.xs.length + (D.xs.length === 1 ? ' entry' : ' entries'); $('hd3').textContent = p.rate + '% AMAYA share';
    var pk = 0; D.val.forEach(function (v, i) { if (v > D.val[pk]) pk = i; });
    var it = {}; D.xs.forEach(function (x) { it[x.itemName] = (it[x.itemName] || 0) + x.qty; });
    var ti = Object.keys(it).sort(function (a, b) { return it[b] - it[a]; })[0], ct = Core.categoryTotals(S, d).sort(function (a, b) { return b.total - a.total; });
    $('hdate').textContent = Core.scopeLabel(S, d);
    if (D.xs.length) {
      $('hline').textContent = 'Day ' + d + (prev > 0 ? ' is ' + (D.t >= prev ? 'up ' : 'down ') + pc + '% on Day ' + (d - 1) : d === 1 ? ' is the opening day' : '') + ': ' + pm(D.t) + ' from ' + D.q + ' items. Sales peaked at ' + hrLabel(D.lab[pk]) + (ct[0] ? ', and ' + ct[0].name + ' led the categories.' : '.');
      $('hh1').textContent = hrLabel(D.lab[pk]); $('hh1s').textContent = pm(D.val[pk]) + ' in that hour'; $('hh2').textContent = ti; $('hh2s').textContent = it[ti] + ' sold';
      $('hh3').textContent = ct[0] ? ct[0].name : '-'; $('hh3s').textContent = ct[0] ? Math.round(ct[0].total / D.t * 100) + '% of the day’s sales' : '';
    } else {
      $('hline').textContent = 'No sales for Day ' + d + ' yet. They will show up here as soon as the first one is added.'; ['hh1', 'hh2', 'hh3'].forEach(function (k) { $(k).textContent = '-'; $(k + 's').textContent = ''; });
    }
    homeChart(D.lab, D.val); homeCats(ct);
    $('hpay').innerHTML = p.rows.filter(function (r) { return r.gets > 0; }).sort(function (a, b) { return b.gets - a.gets; }).slice(0, 6).map(function (r) { return '<div class="li"><span>' + esc(r.owner) + '</span><b>P' + money(r.gets) + '</b></div>'; }).join('') || '<p class="muted">Nothing to pay out yet.</p>';
    $('hrec').innerHTML = D.xs.length ? '<table><tbody>' + D.xs.slice(-6).reverse().map(function (x) { return '<tr><td class="muted">' + Core.timeOf(x.ts) + '</td><td>' + esc(x.itemName) + '</td><td><span class="pill">' + esc(x.owner) + '</span></td><td class="n">x' + x.qty + '</td><td class="n">P' + money(x.total) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">Nothing sold yet. Open Sell to add the first sale.</p>';
    $('hstock').innerHTML = Core.itemRows(S, 'all').filter(function (r) { return r.left != null; }).sort(function (a, b) { return a.left - b.left; }).slice(0, 5).map(function (r) { return '<div class="li"><span>' + esc(r.name) + '<small>' + esc(r.owner) + '</small></span><b class="' + (r.left <= 3 ? 'low' : '') + '">' + r.left + ' left</b></div>'; }).join('') || '<p class="muted">No items with a starting quantity.</p>';
  }
  function hpaint(d, mx) {
    var W = $('hchart').clientWidth || 640, H = 220, pl = 34, pb = 24, n = d.length, step = Math.ceil(n / 6), g = '', tx = '" fill="var(--ink-3)" font-size="11" font-family="Montserrat,sans-serif"';
    var X = function (i) { return pl + i * (W - pl - 6) / (n - 1); }, Y = function (v) { return H - pb - v / mx * (H - pb - 10); };
    PT = d.map(function (v, i) { return [X(i), Y(v)]; }); CUR = d;
    for (var k = 0; k < 4; k++) { var y = 10 + k * (H - pb - 10) / 3; g += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/><text x="0" y="' + (y + 4) + tx + '>' + Math.round(mx * (1 - k / 3)) + '</text>'; }
    HL.forEach(function (h, i) { if (i % step === 0) g += '<text x="' + X(i) + '" y="' + (H - 4) + tx + ' text-anchor="middle">' + hrLabel(h) + '</text>'; });
    var pa = 'M' + PT[0][0] + ',' + PT[0][1]; for (var j = 1; j < n; j++) { var mxp = (PT[j - 1][0] + PT[j][0]) / 2; pa += ' C' + mxp + ',' + PT[j - 1][1] + ' ' + mxp + ',' + PT[j][1] + ' ' + PT[j][0] + ',' + PT[j][1]; }
    $('hg').innerHTML = g; $('hl').setAttribute('d', pa); $('ha').setAttribute('d', pa + ' L' + X(n - 1) + ',' + (H - pb) + ' L' + pl + ',' + (H - pb) + 'Z'); $('hsv').setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  }
  function homeChart(lab, val) {
    var el = $('hchart'); HL = lab;
    el.innerHTML = '<svg id="hsv"><g id="hg"></g><path id="ha" fill="var(--ink)" opacity=".05"/><path id="hl" fill="none" stroke="var(--ink)" stroke-width="1.5"/><circle id="hc" r="4" fill="var(--ink)" stroke="var(--surface)" stroke-width="2" opacity="0"/></svg><div class="tip" id="htip"></div>';
    var from = val.map(function (v, i) { return HC[i] || 0; }), fm = HM, mx = (Math.max.apply(null, val) || 100) * 1.15; HC = val.slice(); HM = mx;
    tween('hc', 750, function (e) { hpaint(val.map(function (v, i) { return from[i] + (v - from[i]) * e; }), fm + (mx - fm) * e); });
    el.onmousemove = function (e) {
      var r = $('hsv').getBoundingClientRect(), i = Math.max(0, Math.min(HL.length - 1, Math.round((e.clientX - r.left - 34) / ((r.width - 40) / (HL.length - 1))))), t = $('htip'), c = $('hc');
      t.style.left = PT[i][0] + 'px'; t.style.top = PT[i][1] + 'px'; t.style.opacity = 1; t.textContent = hrLabel(HL[i]) + ' · ' + pm(CUR[i]); c.setAttribute('cx', PT[i][0]); c.setAttribute('cy', PT[i][1]); c.setAttribute('opacity', 1);
    };
    el.onmouseleave = function () { $('htip').style.opacity = 0; $('hc').setAttribute('opacity', 0); };
  }
  /* categories: bars grow, numbers count, rows glide to their new rank (works across re-renders) */
  function homeCats(rows) {
    var box = $('hcats'); if (!rows.length) { box.innerHTML = '<p class="muted">No category sales yet.</p>'; HP = {}; return; }
    var top = rows[0].total || 1;
    box.innerHTML = rows.map(function (c) { return '<div class="bar" data-id="' + (c.id || '_') + '"><div><span><i class="cdot" style="--cc:' + c.color + '"></i>' + esc(c.name) + '</span><span class="v"></span></div><div class="track"><i></i></div></div>'; }).join('');
    var els = [].slice.call(box.children), bt = box.getBoundingClientRect().top, np = {};
    els.forEach(function (e, i) {
      var id = e.dataset.id, o = HP[id], y = e.getBoundingClientRect().top - bt; np[id] = { y: y, w: rows[i].total / top * 100 };
      if (o && !RM) e.style.transform = 'translateY(' + (o.y - y) + 'px)';
      e.querySelector('.track i').style.width = (o ? o.w : 0) + '%'; num(e.querySelector('.v'), 'cv' + id, rows[i].total, pmh);
    });
    void box.offsetWidth;
    els.forEach(function (e) { e.style.transition = 'transform .65s cubic-bezier(.65,0,.35,1)'; e.style.transform = ''; e.querySelector('.track i').style.width = np[e.dataset.id].w + '%'; });
    HP = np;
  }
  function dayInit() {
    var tdy = today(), n = Core.numDays(S), pick = 0;
    for (var i = 1; i <= n; i++) if (S.settings.days[i] === tdy) pick = i;
    if (!pick) { try { pick = Number(localStorage.getItem('amaya_day')) || 1; } catch (e) { pick = 1; } }
    ui.day = Math.min(Math.max(1, pick), n); ui.scope = ui.day;
  }

  function render() {
    if (!ui.user) return;
    if (!allowed(ui.tab)) ui.tab = 'sell';
    renderShell();
    var v = { home: viewHome, sell: viewSell, items: viewItems, sales: viewSales, sheet: viewSheet, payout: viewPayout, export: viewExport, settings: viewSettings }[ui.tab];
    $('view').innerHTML = v() + '<datalist id="owners">' + owners().map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>';
    if (ui.tab === 'sell') { catBar(); hscroll($('catbar')); chips(); cart(); recent(); var q = $('q'); q.oninput = function () { ui.q = q.value; chips(); }; }
    if (ui.tab === 'items') itemsTable();
    if (ui.tab === 'home') homeFill();
    if (ui.tab === 'export') xfill();
    var vw = $('view'); vw.classList.remove('anim');
    if (ui.animTab) { void vw.offsetWidth; vw.classList.add('anim'); ui.animTab = false; }
  }

  /* ---------- SELL ---------- */
  function viewSell() {
    return '<div class="sellgrid"><div class="card"><h2>1. Pick an item</h2><input id="q" type="search" placeholder="Search item or owner..." value="' + esc(ui.q) + '" autocomplete="off"><div id="catbar" class="catbar"></div><div id="chips" class="chips"></div></div>' +
      '<div class="col"><div class="card" id="cart"></div>' +
      '<div class="card"><h2>Recent sales - ' + esc(Core.scopeLabel(S, ui.day)) + '</h2><div id="recent"></div></div></div></div>';
  }
  /* horizontal scroll for the filter bar: mouse wheel, click-and-drag, touch (native) */
  function hscroll(el) {
    if (!el || el._hs) return; el._hs = 1; var down = false, moved = false, sx = 0, sl = 0;
    el.addEventListener('wheel', function (e) {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY, max = el.scrollWidth - el.clientWidth;
      if ((d > 0 && el.scrollLeft >= max - 1) || (d < 0 && el.scrollLeft <= 0)) return;
      el.scrollLeft += d; e.preventDefault();
    }, { passive: false });
    el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; });
    el.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; el.classList.add('drag'); } if (moved) el.scrollLeft = sl - dx; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { el.addEventListener(n, function () { down = false; el.classList.remove('drag'); }); });
    el.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  }
  function catBar() {
    var cm = catMap(), rows = Core.itemRows(S, 'all'), none = rows.filter(function (r) { return !cm[r.category]; }).length;
    if (ui.cat && ui.cat !== '_none' && !cm[ui.cat]) ui.cat = '';
    var el = $('catbar'); if (!el) return;
    if (!(S.categories || []).length) { el.innerHTML = ''; return; }
    var b = function (id, label, color, n) { return '<button class="cbtn' + (ui.cat === id ? ' on' : '') + '" data-cat="' + id + '" style="' + (color === 'ALL' ? '--cc:var(--accent);--ct:var(--on-accent)' : '--cc:' + color + ';--ct:' + inkFor(color)) + '">' + esc(label) + '<small>' + n + '</small></button>'; };
    var sl0 = el.scrollLeft; el.innerHTML = b('', 'All', 'ALL', rows.length) + S.categories.map(function (c) { return b(c.id, c.name, c.color, rows.filter(function (r) { return r.category === c.id; }).length); }).join('') + (none ? b('_none', 'Uncategorized', '#64748b', none) : ''); el.scrollLeft = sl0;
  }
  function chips() {
    var q = ui.q.toLowerCase(), rows = Core.itemRows(S, 'all'), cm = catMap();
    var list = rows.filter(function (r) {
      if (ui.cat === '_none' ? cm[r.category] : (ui.cat && r.category !== ui.cat)) return false;
      return !q || (r.name + ' ' + r.owner).toLowerCase().indexOf(q) >= 0;
    });
    if (!S.items.length) { $('chips').innerHTML = '<p class="muted">No items yet. Go to <b>Items</b> to add one, or <b>Settings</b> to load the starter list.</p>'; return; }
 var st = ui.stagger; ui.stagger = false; $('chips').className = 'chips' + (st ? ' stagger' : '');
    $('chips').innerHTML = list.map(function (r, n) {
      var low = r.left != null && r.left <= 0;
      return '<button style="--i:' + Math.min(n, 14) + ';--cc:' + (cm[r.category] ? cm[r.category].color : '#8d9399') + '" class="chip' + (ui.sel === r.id ? ' on' : '') + (low ? ' low' : '') + '" data-pick="' + r.id + '"><b>' + esc(r.name) + '</b><small>' + esc(r.owner) + ' &middot; ' + mny(r.price, 1) + (r.left != null ? ' &middot; left ' + qn(r.left) : '') + '</small></button>';
    }).join('') || '<p class="muted">No match.</p>';
  }
  function cart() {
    var el = $('cart'), it = S.items.filter(function (i) { return i.id === ui.sel; })[0];
    if (!it) { el.innerHTML = '<h2>2. Add the sale</h2><div class="empty"><svg class="i"><use href="#sell"/></svg><p>Tap an item to start a sale.</p></div>'; return; }
    var c = catMap()[it.category];
    el.innerHTML = '<h2>2. Add the sale</h2>' +
      '<div class="sel"><b class="seln">' + esc(it.name) + '</b><span class="selm">' + (c ? esc(c.name) + '&nbsp;&middot;&nbsp;' : '') + esc(it.owner) + '</span></div>' +
      '<div class="fields"><label>Price each (P)<input id="price" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(ui.price) + '"></label>' +
      '<div class="qwrap"><span>Quantity</span><div class="stepper"><button data-step="-1" type="button" aria-label="Decrease quantity">&minus;</button><div class="roll"><input id="qty" type="number" min="1" step="1" inputmode="numeric" aria-label="Quantity" value="' + ui.qty + '"></div><button data-step="1" type="button" aria-label="Increase quantity">+</button></div></div></div>' +
      '<div class="totalbar"><span>Total</span><span class="total" id="prev"></span></div>' +
      '<button class="btn big" data-act="addSale" data-snd>Add sale &mdash; ' + esc(Core.scopeLabel(S, ui.day)) + '</button>';
    $('price').oninput = function () { ui.price = this.value; preview(); };
    $('qty').oninput = function () { ui.qty = Math.max(1, Math.floor(Number(this.value) || 1)); preview(); };
    preview();
  }
  function preview() { var p = $('prev'); if (p) FX.count(p, 'prev', (parseFloat(ui.price) || 0) * ui.qty, function (v) { return mny(v); }); }
  function recent() {
    var all = Core.scopeSales(S, ui.day), xs = all.slice(-8).reverse(), tot = 0, units = 0;
    all.forEach(function (x) { tot += x.total; units += x.qty; });
    var fl = ui.flash; ui.flash = false;
    $('recent').innerHTML = '<div class="metric"><span class="mk">Day total</span><b class="mv" id="daytot"></b><span class="ms">' + all.length + (all.length === 1 ? ' sale' : ' sales') + ' &middot; ' + units + (units === 1 ? ' item' : ' items') + '</span></div>' + (xs.length ? '<table><tbody>' + xs.map(function (x, n) {
      return '<tr' + (fl && n === 0 ? ' class="flash"' : '') + '><td class="muted">' + Core.timeOf(x.ts) + '</td><td>' + esc(x.itemName) + ' <span class="muted">(' + esc(x.owner) + ')</span></td><td class="n">x' + x.qty + '</td><td class="n">P' + money(x.total) + '</td><td class="n">' + (canDelete(x) ? '<button class="link" data-delsale="' + x.id + '" title="Delete this sale" aria-label="Delete this sale">&#10005;</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty"><svg class="i"><use href="#log"/></svg><p>No sales yet for this day.</p><small>New sales will show up here.</small></div>');
    var dt = $('daytot'); FX.count(dt, 'daytot', tot, function (v) { return mny(v); }); if (fl) FX.pop(dt);
  }

  /* ---------- ITEMS ---------- */
  function viewItems() {
    return '<div class="stats" id="istats"><div class="stat"><span>Items</span><b id="is1"></b></div><div class="stat"><span>Units sold</span><b id="is2"></b></div><div class="stat"><span>Sales, all days</span><b id="is3"></b></div><div class="stat"><span>Running low</span><b id="is4"></b></div></div><div class="card"><h2>Add an item</h2><div class="row">' +
      '<label>Item name<input id="n_name" autocomplete="off"></label><label>Owner<input id="n_owner" list="owners" autocomplete="off"></label>' +
      '<label>Price (P)<input id="n_price" type="number" min="0" step="0.01" inputmode="decimal"></label>' +
      '<label>Category<select id="n_cat" class="f">' + catOptions(ui.newCat || '') + '</select></label>' +
      '<label>Starting qty (optional)<input id="n_qty" type="number" min="0" step="1" inputmode="numeric"></label>' +
      '<button class="btn" data-act="addItem" data-snd>Add item</button></div></div>' + catManager() +
      '<div class="card"><h2>Main item log <span class="muted" style="font-weight:400">(sold and left count all days)</span></h2><div class="row" style="margin-bottom:12px"><label>Search<input data-itemq placeholder="Item or owner" value="' + esc(ui.itemQ || '') + '" autocomplete="off"></label><label>Show category<select class="f" data-itemcat><option value="">All</option>' + (S.categories || []).map(function (c) { return '<option value="' + c.id + '"' + (ui.itemCat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '<option value="_none"' + (ui.itemCat === '_none' ? ' selected' : '') + '>Uncategorized</option></select></label></div><div class="wrap" id="itemsTable"></div></div>';
  }
  function catManager() {
    var rows = Core.itemRows(S, 'all'), pal = Core.PALETTE, cats = S.categories || [], next = pal[cats.length % pal.length], cm = catMap();
    var list = cats.map(function (c) {
      var n = rows.filter(function (r) { return r.category === c.id; }).length;
      return '<div class="catcard" style="--cc:' + c.color + '"><input type="color" value="' + c.color + '" data-catcolor="' + c.id + '" aria-label="Color"><input type="text" value="' + esc(c.name) + '" data-catname="' + c.id + '" aria-label="Category name"><span class="cnt">' + qn(n) + ' item' + (n === 1 ? '' : 's') + '</span><button class="link" data-delcat="' + c.id + '">Delete</button></div>';
    }).join('') || '<p class="muted">No categories yet. Add the first one below.</p>';
    var body = cats.concat([{ id: '', name: 'Uncategorized', color: '#8d9399' }]).map(function (c) {
      var its = S.items.filter(function (i) { return c.id ? i.category === c.id : !cm[i.category]; }); if (!its.length) return '';
      var ow = []; its.forEach(function (i) { if (ow.indexOf(i.owner) < 0) ow.push(i.owner); });
      return '<tr><td><span class="cpill" style="--cc:' + c.color + '">' + esc(c.name) + '</span></td><td class="own">' + esc(ow.join(', ')) + '</td><td class="n q">' + its.length + '</td></tr>';
    }).join('');
    return '<div class="cls"><div class="clshead"><h2>Item classification &amp; organization</h2><p>A category groups items. It becomes a filter button on Sell and the Type shown on the Sheet. The owner is separate and decides the payout.</p></div><div class="clsgrid">' +
      '<div class="card"><h3>Categories</h3><p class="sub">Rename or recolor and it saves automatically. Deleting a category keeps its items; they become uncategorized.</p>' + list +
      '<div class="catnew"><span class="nl">Add a category</span><input type="color" id="c_color" value="' + next + '" aria-label="Color"><input type="text" id="c_name" placeholder="Category name" autocomplete="off"><button class="btn" data-act="addCat">Add category</button></div></div>' +
      '<div class="card"><h3>Where items appear</h3><p class="sub">Each category with the owners whose items are in it.</p><table class="plct"><thead><tr><th>Category</th><th>Owners</th><th class="n">Items</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '</div></div>';
  }
  function rnd(v) { return Math.round(v); }
  function itemsTable() {
    var cm = catMap(), all = Core.itemRows(S, 'all'), q = (ui.itemQ || '').toLowerCase(), an = ui.ranim; ui.ranim = false;
    var rows = all.filter(function (r) {
      if (!(ui.itemCat === '' ? true : ui.itemCat === '_none' ? !cm[r.category] : r.category === ui.itemCat)) return false;
      return !q || (r.name + ' ' + r.owner).toLowerCase().indexOf(q) >= 0;
    }), units = 0, val = 0, low = 0;
    all.forEach(function (r) { units += r.sold; val += r.sales; if (r.left != null && r.left <= 3) low++; });
    num($('is1'), 'is1', all.length, rnd); num($('is2'), 'is2', units, rnd); num($('is3'), 'is3', val, pmh); num($('is4'), 'is4', low, rnd);
    var fid = ui.flashId; ui.flashId = null;
    $('itemsTable').innerHTML = '<table><thead><tr><th>Item</th><th>Category</th><th>Owner</th><th class="n">Price</th><th class="n">Start qty</th><th class="n">Sold</th><th class="n">Left</th><th class="n">Sales</th><th></th></tr></thead><tbody>' +
      (rows.map(function (r, i) {
        var c = cm[r.category], out = r.left != null && r.left <= 0, lw = r.left != null && r.left > 0 && r.left <= 3, pct = r.qty ? Math.min(100, r.sold / r.qty * 100) : 0;
        return '<tr class="' + (an ? 'rin' : '') + (r.id === fid ? ' flash' : '') + '" id="row_' + r.id + '" style="--i:' + Math.min(i, 14) + '"><td><span class="nm">' + esc(r.name) + '</span>' + (out ? '<span class="tg neg">Sold out</span>' : lw ? '<span class="tg neg">Low</span>' : '') +
          (r.qty ? '<div class="mini' + (out || lw ? ' low' : '') + '"><i style="width:' + pct + '%"></i></div>' : '') + '</td><td><select class="f catsel" style="--cc:' + (c ? c.color : 'var(--line)') + '" data-setcat="' + r.id + '">' + catOptions(r.category, '-') + '</select></td><td>' + esc(r.owner) + '</td><td class="n m">' + money(r.price) + '</td><td class="n q">' + (r.qty == null ? '-' : r.qty) + '</td><td class="n q">' + r.sold + '</td><td class="n q' + (out ? ' low' : '') + '">' + (r.left == null ? '-' : r.left) + '</td><td class="n m">' + money(r.sales) + '</td><td class="n"><button class="link edit" data-edit="' + r.id + '">Edit</button></td></tr>';
      }).join('') || '<tr><td colspan="9" class="muted">' + (all.length ? 'No items match. Try a different search or category.' : 'No items yet. Add your first one above.') + '</td></tr>') + '</tbody></table>';
    var fr = fid && $('row_' + fid); if (fr && fr.scrollIntoView) fr.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
  }

  /* ---------- SALES LOG ---------- */
  function viewSales() {
    var xs = Core.scopeSales(S, ui.scope), tot = 0, q = 0; xs.forEach(function (x) { tot += x.total; q += x.qty; });
    return '<div class="card"><div class="row"><label>View<span></span>' + scopeSelect() + '</label></div></div>' +
      '<div class="stats">' + stat('Sales', mny(tot)) + stat('Items sold', qn(q)) + stat('Entries', xs.length) + '</div>' +
      '<div class="card"><div class="wrap"><table><thead><tr><th>Day</th><th>Time</th><th>Item</th><th>Owner</th><th>Cashier</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th><th></th></tr></thead><tbody>' +
      (xs.slice().reverse().map(function (x) {
        return '<tr><td>' + x.day + '</td><td>' + Core.timeOf(x.ts) + '</td><td>' + esc(x.itemName) + '</td><td>' + esc(x.owner) + '</td><td>' + esc(x.cashier || '') + '</td><td class="n q">' + x.qty + '</td><td class="n m">' + money(x.price) + '</td><td class="n m">' + money(x.total) + '</td><td class="n">' + (canDelete(x) ? '<button class="link" data-delsale="' + x.id + '">&#10005;</button>' : '') + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="muted">No sales yet.</td></tr>') + '</tbody></table></div></div>';
  }

  /* ---------- SHEET (Excel-style) ---------- */
  function viewSheet() {
    var gs = Core.groups(S, ui.scope), tot = 0, sold = 0; gs.forEach(function (g) { tot += g.sales; sold += g.sold; });
    var body = '';
    gs.forEach(function (g) {
      g.rows.forEach(function (r, i) {
        body += '<tr>' + (i === 0 ? '<td rowspan="' + g.rows.length + '"><b>' + esc(g.owner) + '</b></td>' : '') +
          '<td>' + esc(r.name) + '</td><td class="n m">' + money(r.price) + '</td><td class="n q">' + (r.qty == null ? '' : r.qty) + '</td><td class="n q">' + (r.sold || '') + '</td><td class="n q' + (r.left != null && r.left <= 0 ? ' low' : '') + '">' + (r.left == null ? '' : r.left) + '</td><td class="n m">' + (r.sales ? money(r.sales) : '') + '</td><td class="typ">' + (catMap()[r.category] ? esc(catMap()[r.category].name) : '<span class="muted">-</span>') + '</td>' +
          (i === 0 ? '<td class="n m" rowspan="' + g.rows.length + '"><b>' + money(g.sales) + '</b></td>' : '') + '</tr>';
      });
    });
    return '<div class="card"><div class="row"><label>View<span></span>' + scopeSelect() + '</label></div></div>' +
      '<div class="stats">' + stat('Total sales', mny(tot)) + stat('Items sold', qn(sold)) + '</div>' +
      '<div class="card' + (ui.full ? ' full' : '') + '"><div class="cardbar"><span class="muted">' + (ui.full ? 'Press Esc or Close to go back.' : 'Scroll inside the table, or expand it to see everything.') + '</span><button class="btn alt sm" data-expand>' + (ui.full ? 'Close' : 'Expand') + '</button></div><div class="wrap"><table><thead><tr><th>Owner</th><th>Products</th><th class="n">Price</th><th class="n">Whole qty</th><th class="n">Sold</th><th class="n">Remaining</th><th class="n">Total sold item</th><th class="typ">Type</th><th class="n">Whole sales</th></tr></thead><tbody>' +
      (body || '<tr><td colspan="9" class="muted">No items yet.</td></tr>') + '<tr class="tot"><td colspan="6">TOTAL :</td><td class="n m" colspan="3">' + money(tot) + '</td></tr></tbody></table></div></div>';
  }

  /* ---------- PAYOUT ---------- */
  function viewPayout() {
    var p = Core.payout(S, ui.scope);
    return '<div class="card"><div class="row"><label>View<span></span>' + scopeSelect() + '</label></div>' +
      '<p class="muted" style="margin:8px 0 0">AMAYA keeps ' + p.rate + '% of each owner\'s sales. AMAYA-owned booths (' + esc(S.settings.amayaOwners || 'none') + ') are 100% AMAYA. Change this in Settings.</p></div>' +
      '<div class="stats">' + stat('Total sales', mny(p.total.sales)) + stat('AMAYA income', mny(p.total.amaya)) + stat('To pay owners', mny(p.total.owners)) + '</div>' +
      '<div class="card"><div class="wrap"><table><thead><tr><th>Owner</th><th class="n">Items</th><th class="n">Sales</th><th class="n">AMAYA %</th><th class="n">AMAYA share</th><th class="n">Owner gets</th></tr></thead><tbody>' +
      p.rows.map(function (r) {
        return '<tr><td>' + esc(r.owner) + (r.isAmaya ? ' <span class="pill">AMAYA</span>' : '') + '</td><td class="n q">' + r.qty + '</td><td class="n m">' + money(r.sales) + '</td><td class="n">' + r.rate + '%</td><td class="n m">' + money(r.share) + '</td><td class="n' + (r.isAmaya ? '' : ' m') + '"><b>' + (r.isAmaya ? '-' : money(r.gets)) + '</b></td></tr>';
      }).join('') + '<tr class="tot"><td>TOTAL :</td><td class="n"></td><td class="n m">' + money(p.total.sales) + '</td><td></td><td class="n m">' + money(p.total.amaya) + '</td><td class="n m">' + money(p.total.owners) + '</td></tr></tbody></table></div></div>' +
      '<div class="card"><h2>Sales by category</h2><div class="wrap"><table><thead><tr><th>Category</th><th class="n">Items sold</th><th class="n">Sales</th></tr></thead><tbody>' +
      (Core.categoryTotals(S, ui.scope).map(function (c) { return '<tr><td><span class="cpill" style="background:' + c.color + ';color:' + inkFor(c.color) + '">' + esc(c.name) + '</span></td><td class="n q">' + c.qty + '</td><td class="n m">' + money(c.total) + '</td></tr>'; }).join('') || '<tr><td colspan="3" class="muted">No sales yet.</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card"><h2>Cashier totals</h2><div class="wrap"><table><thead><tr><th>Cashier</th><th class="n">Sales entries</th><th class="n">Items</th><th class="n">Total</th></tr></thead><tbody>' +
      (Core.cashierTotals(S, ui.scope).map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td class="n">' + c.entries + '</td><td class="n q">' + c.qty + '</td><td class="n m">' + money(c.total) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="muted">No sales yet.</td></tr>') + '</tbody></table></div></div>';
  }

  /* ---------- EXPORT ---------- */
  var FMT = [['txt', 'log', 'Receipt', '.txt · a day summary to print or share'], ['xlsx', 'sheet', 'Excel workbook', '.xlsx · six sheets, ready to sort'], ['sales', 'exp', 'Sales log', '.csv · every sale on its own line'], ['payout', 'pay', 'Payout', '.csv · what each owner is owed'], ['print', 'print', 'Print', 'Send the receipt to a printer']];
  function viewExport() {
    return '<div class="card"><div class="xhead"><div><h2>Export</h2><p class="muted">Pick what to include, then download.</p></div><div class="seg" id="xscope"></div></div>' +
      '<div class="stats" style="margin:16px 0 0"><div class="stat"><span>Sales</span><b id="xs1"></b></div><div class="stat"><span>Items sold</span><b id="xs2"></b></div><div class="stat"><span>Entries</span><b id="xs3"></b></div><div class="stat"><span>To pay owners</span><b id="xs4"></b></div></div></div>' +
      '<div class="xgrid"><div class="fmts">' + FMT.map(function (x) { return '<button class="fmt" data-dl="' + x[0] + '"><span class="fi">' + ic(x[1]) + '</span><b>' + x[2] + '</b><small>' + x[3] + '</small><span class="ok">Saved ✓</span></button>'; }).join('') + '</div>' +
      '<div class="paperwrap"><pre class="receipt paper" id="xrec"></pre></div></div>';
  }
  function xfill() {
    var sc = ui.scope, p = Core.payout(S, sc), xs = Core.scopeSales(S, sc), q = 0, ds = [];
    xs.forEach(function (x) { q += x.qty; });
    for (var d = 1; d <= Core.numDays(S); d++) ds.push([d, 'Day ' + d]); ds.push(['all', 'All days']);
    bar($('xscope'), ds, sc, 'data-x');
    num($('xs1'), 'xs1', p.total.sales, pmh); num($('xs2'), 'xs2', q, rnd); num($('xs3'), 'xs3', xs.length, rnd); num($('xs4'), 'xs4', p.total.owners, pmh);
    var r = $('xrec'); r.textContent = Core.receiptText(S, sc); r.classList.remove('print'); void r.offsetWidth; r.classList.add('print');
  }
  function exportFx(t) { t.classList.add('done'); toast('Saved: ' + t.querySelector('b').textContent); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('done'); }, 1900); }
  function doDownload(kind) {
    var tag = 'AMAYA_' + Core.fileTag(S, ui.scope);
    if (kind === 'txt') dl(tag + '_receipt.txt', Core.receiptText(S, ui.scope), 'text/plain;charset=utf-8');
    else if (kind === 'sales') dl(tag + '_sales.csv', Core.toCsv(Core.salesRows(S, ui.scope)), 'text/csv;charset=utf-8');
    else if (kind === 'payout') dl(tag + '_payout.csv', Core.toCsv(Core.payoutRows(S, ui.scope)), 'text/csv;charset=utf-8');
    else if (kind === 'xlsx') dl(tag + '.xlsx', XlsxLite.build(Core.xlsxSheets(S, ui.scope)), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    else if (kind === 'print') window.print();
  }

  /* ---------- SETTINGS ---------- */
  function viewSettings() {
    var dates = '';
    for (var d = 1; d <= Core.numDays(S); d++) dates += '<label>Day ' + d + ' date<input type="date" data-date="' + d + '" value="' + esc(S.settings.days[d] || '') + '"></label>';
    return '<div class="card"><h2>Booth settings</h2><div class="row"><label>Event / booth name<input id="s_name" value="' + esc(S.settings.eventName) + '"></label>' +
      '<label>AMAYA share of owners\' sales (%)<input id="s_rate" type="number" min="0" max="100" step="0.5" value="' + esc(S.settings.shareRate) + '"></label>' +
      '<label>AMAYA-owned booths (owner names, comma separated)<input id="s_am" value="' + esc(S.settings.amayaOwners) + '"></label></div>' +
      '<div class="row" style="margin-top:8px">' + dates + '</div><div class="actbar"><button class="btn" data-act="saveSettings">Save settings</button><div class="grp"><span class="gl">Event days</span><button class="btn alt" data-act="addDay">+ Add day ' + (Core.numDays(S) + 1) + '</button><button class="btn red" data-act="removeDay">Remove day ' + Core.numDays(S) + '</button></div></div></div>' +
      '<div class="card"><h2>Cashiers &amp; admins</h2><p class="muted">Cashiers can sell, view the sales log and the sheet. Admins can do everything. Everyone logs in with a PIN (4-8 digits), once per day per device.</p><div class="wrap"><table><tbody>' +
      S.users.map(function (u) { return '<tr><td><b>' + esc(u.name) + '</b> <span class="pill">' + u.role + '</span></td><td class="n"><button class="link edit" data-resetpin="' + u.id + '">Reset PIN</button><button class="link" data-deluser="' + u.id + '">Remove</button></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="row" style="margin-top:8px"><label>Name<input id="u_name" autocomplete="off"></label><label>Role<select id="u_role" class="f"><option value="cashier">Cashier</option><option value="admin">Admin</option></select></label><label>PIN<input id="u_pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></label><button class="btn" data-act="addUser">Add person</button></div></div>' +
      '<div class="card"><h2>Logo &amp; background</h2><p class="muted">Replace <b>img/logo.png</b> (square works best) and <b>img/background.jpg</b> with your own pictures, then refresh the page. See README.txt.</p></div>' +
      '<div class="card"><h2>Starter items</h2><div class="split"><p class="muted">Adds the AMAYA booth products (owners, prices, starting stock). Items that already exist are skipped.</p><button class="btn alt" data-act="starter">Load starter items</button></div></div>' +
      '<div class="card"><h2>Backup</h2><div class="btns"><button class="btn alt" data-act="backup">Download backup (.json)</button><label class="btn alt" style="display:inline-block">Restore backup<input type="file" id="restore" accept=".json,application/json" hidden></label></div>' +
      '<p class="muted">Tip: download a backup at the end of every day. Mode: ' + (Store.mode === 'server' ? 'data is saved on the laptop running the server and shared by every device.' : 'data is saved only inside this browser on this device.') + '</p></div>' +
      '<div class="card"><h2>Danger zone</h2><div class="split"><p class="muted">Removes every sale on every day. Items, categories and people stay. Download a backup first.</p><button class="btn red" data-act="reset">Delete ALL sales (keep items)</button></div></div>';
  }

  /* ---------- events ---------- */
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; ui.tab = b.getAttribute('data-tab'); ui.full = false; ui.ranim = true; ui.animTab = true; ui.stagger = true; render(); window.scrollTo(0, 0); });
  $('day').addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (!b) return; ui.day = Number(b.getAttribute('data-d')); ui.scope = ui.day; try { localStorage.setItem('amaya_day', ui.day); } catch (x) { } render(); });
  $('collapse').addEventListener('click', function () { $('app').classList.toggle('c'); });
  if (window.ResizeObserver) { var ro = new ResizeObserver(snapBars); ro.observe($('tabs')); ro.observe($('day')); }
  if (document.fonts) document.fonts.ready.then(snapBars);
  addEventListener('resize', function () { if ($('hsv')) hpaint(CUR, HM); });
  var TH = ['dark', 'light', 'sand'], thi = 0;
  try { var sv = localStorage.getItem('amaya_theme'); if (TH.indexOf(sv) >= 0) { thi = TH.indexOf(sv); document.documentElement.dataset.theme = sv; } } catch (x) { }
  $('theme').addEventListener('click', function () { thi = (thi + 1) % TH.length; document.documentElement.dataset.theme = TH[thi]; this.firstElementChild.style.transform = 'rotate(' + thi * 120 + 'deg)'; try { localStorage.setItem('amaya_theme', TH[thi]); } catch (x) { } toast('Theme: ' + TH[thi]); });
  /* works even with an older index.html: add the sound button and icons if they are not there */
  (function () {
    var defs = document.querySelector('svg defs'), ico = { ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', warn: '<path d="M12 8v5M12 16.5h.01M12 3 2.5 20h19z"/>', snd: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>', sndoff: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l4 5M20 9.5l-4 5"/>' };
    if (defs) Object.keys(ico).forEach(function (k) { if (!document.getElementById(k)) defs.insertAdjacentHTML('beforeend', '<symbol id="' + k + '" viewBox="0 0 24 24">' + ico[k] + '</symbol>'); });
    if (!$('sound') && $('who')) { var b = document.createElement('button'); b.className = 'ibtn'; b.id = 'sound'; b.setAttribute('aria-label', 'Button sounds'); b.innerHTML = '<svg class="i"><use href="#snd"/></svg>'; $('who').parentNode.insertBefore(b, $('who')); }
  })();
  var snd = $('sound');
  function sndUi() { if (!snd) return; var u = snd.querySelector('use'), on = FX.soundOn(); snd.setAttribute('aria-pressed', on); snd.title = on ? 'Button sounds on' : 'Button sounds off'; if (u) u.setAttribute('href', on ? '#snd' : '#sndoff'); }
  sndUi(); if (snd) snd.addEventListener('click', function () { FX.setSound(!FX.soundOn()); sndUi(); toast('Sounds ' + (FX.soundOn() ? 'on' : 'off')); });
  $('who').addEventListener('click', function (e) { if (e.target.hasAttribute('data-logout')) logout(); });

  $('view').addEventListener('input', function (e) { if (e.target.hasAttribute('data-itemq')) { ui.itemQ = e.target.value; itemsTable(); } });
  $('view').addEventListener('change', function (e) {
    var tg = e.target;
    if (tg.hasAttribute('data-itemcat')) { ui.itemCat = tg.value; ui.ranim = true; itemsTable(); return; }
    if (tg.hasAttribute('data-setcat')) { act('setItemCategory', { id: tg.getAttribute('data-setcat'), category: tg.value }, 'Category set').then(function () { itemsTable(); }).catch(function () { }); return; }
    if (tg.hasAttribute('data-catcolor')) { act('updateCategory', { id: tg.getAttribute('data-catcolor'), color: tg.value }, 'Color saved').then(render).catch(function () { }); return; }
    if (tg.hasAttribute('data-catname')) { act('updateCategory', { id: tg.getAttribute('data-catname'), name: tg.value }, 'Category renamed').then(render).catch(function () { render(); }); return; }
    if (e.target.hasAttribute('data-scope')) { ui.scope = e.target.value === 'all' ? 'all' : Number(e.target.value); render(); }
    if (e.target.id === 'restore' && e.target.files[0]) {
      var f = e.target.files[0], rd = new FileReader();
      rd.onload = function () {
        try { var st = JSON.parse(rd.result); if (!confirm('Replace everything with this backup?')) return; act('importAll', { state: st }, 'Backup restored').then(render); } catch (x) { toast('Not a valid backup file', true); }
      };
      rd.readAsText(f);
    }
  });

  $('view').addEventListener('click', function (e) {
    var t = e.target.closest('button,[data-pick]'); if (!t) return;
    if (t.hasAttribute('data-pick')) {
      ui.sel = t.getAttribute('data-pick'); ui.qty = 1;
      var it = S.items.filter(function (i) { return i.id === ui.sel; })[0]; ui.price = it ? String(it.price) : ''; FX.forget('prev');
      chips(); cart(); return;
    }
    if (t.hasAttribute('data-cat')) { ui.cat = t.getAttribute('data-cat'); ui.stagger = true; catBar(); chips(); return; }
    if (t.hasAttribute('data-delcat')) {
      var cid = t.getAttribute('data-delcat'), cname = (catMap()[cid] || {}).name;
      if (!confirm('Delete category "' + cname + '"? Its items stay, but become uncategorized.')) return;
      act('deleteCategory', { id: cid }, 'Category deleted').then(render).catch(function () { }); return;
    }
    if (t.hasAttribute('data-step')) { var oq = ui.qty, dir = Number(t.getAttribute('data-step')); ui.qty = Math.max(1, ui.qty + dir); $('qty').value = ui.qty; if (ui.qty !== oq) FX.roll($('qty'), dir, oq); preview(); return; }
    if (t.hasAttribute('data-expand')) { ui.full = !ui.full; render(); return; }
    if (t.hasAttribute('data-x')) { var xv = t.getAttribute('data-x'); ui.scope = xv === 'all' ? 'all' : Number(xv); xfill(); return; }
    if (t.hasAttribute('data-dl')) { doDownload(t.getAttribute('data-dl')); exportFx(t); return; }
    if (t.hasAttribute('data-edit')) { openEdit(t.getAttribute('data-edit')); return; }
    if (t.hasAttribute('data-resetpin')) {
      var np = prompt('New PIN (4 to 8 digits):'); if (np === null) return;
      if (!/^\d{4,8}$/.test(np)) return toast('PIN must be 4 to 8 digits', true);
      var sl = Math.random().toString(36).slice(2, 10);
      act('updateUser', { id: t.getAttribute('data-resetpin'), salt: sl, pinHash: Core.hashPin(sl, np) }, 'PIN changed').catch(function () { }); return;
    }
    if (t.hasAttribute('data-deluser')) {
      if (!confirm('Remove this person? Their past sales stay in the log.')) return;
      var did = t.getAttribute('data-deluser');
      act('deleteUser', { id: did }, 'Person removed').then(function () { if (ui.user && ui.user.id === did) logout(); else render(); }).catch(function () { }); return;
    }
    if (t.hasAttribute('data-delsale')) {
      if (!confirm('Delete this sale?')) return;
      act('deleteSale', { id: t.getAttribute('data-delsale') }, 'Sale deleted').then(render); return;
    }
    var a = t.getAttribute('data-act'); if (!a) return;
    if (a === 'addSale') {
      var rows = Core.itemRows(S, 'all'), r = rows.filter(function (x) { return x.id === ui.sel; })[0];
      if (!r) return toast('Pick an item first', true);
      if (r.left != null && ui.qty > r.left && !confirm('Only ' + Math.max(0, r.left) + ' left in stock. Add anyway?')) return;
      t.disabled = true; act('addSale', { itemId: ui.sel, qty: ui.qty, price: ui.price, day: ui.day, cashier: ui.user.name }, 'Added: ' + r.name + ' x' + ui.qty).then(function () { ui.qty = 1; ui.flash = true; chips(); cart(); recent(); var nb = document.querySelector('[data-act="addSale"]'); if (nb) nb.classList.add('landed'); }).catch(function () { t.disabled = false; });
    } else if (a === 'addItem') {
      ui.newCat = $('n_cat').value;
      act('addItem', { name: $('n_name').value, owner: $('n_owner').value, price: $('n_price').value, qty: $('n_qty').value, category: ui.newCat }, 'Item added').then(function () { return S; }).then(function () {
        var o = $('n_owner').value; ui.flashId = S.items[S.items.length - 1].id; render(); $('n_owner').value = o; $('n_name').focus();
      }).catch(function () { });
    } else if (a === 'saveSettings') {
      var days = {}; document.querySelectorAll('[data-date]').forEach(function (i) { days[i.getAttribute('data-date')] = i.value; });
      act('setSettings', { eventName: $('s_name').value, shareRate: $('s_rate').value, amayaOwners: $('s_am').value, days: days }, 'Settings saved').then(render).catch(function () { });
    } else if (a === 'addCat') {
      act('addCategory', { name: $('c_name').value, color: $('c_color').value }, 'Category added').then(render).catch(function () { });
    } else if (a === 'addUser') {
      var pin = $('u_pin').value; if (!/^\d{4,8}$/.test(pin)) return toast('PIN must be 4 to 8 digits', true);
      var salt = Math.random().toString(36).slice(2, 10);
      act('addUser', { name: $('u_name').value, role: $('u_role').value, salt: salt, pinHash: Core.hashPin(salt, pin) }, 'Person added').then(render).catch(function () { });
    } else if (a === 'addDay') {
      act('addDay', {}, 'Day added').then(function () { ui.scope = ui.day; render(); }).catch(function () { });
    } else if (a === 'removeDay') {
      if (!confirm('Remove the last day?')) return;
      act('removeDay', {}, 'Day removed').then(function () { ui.day = Math.min(ui.day, Core.numDays(S)); ui.scope = ui.day; render(); }).catch(function () { });
    } else if (a === 'starter') {
      act('addItemsBulk', { items: Core.STARTER }, 'Starter items loaded').then(render).catch(function () { });
    } else if (a === 'backup') {
      dl('AMAYA_backup_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(S, null, 2), 'application/json');
    } else if (a === 'reset') {
      if (confirm('Delete ALL sales for ALL days? This cannot be undone.') && confirm('Really delete everything sold? (Download a backup first if unsure.)')) act('resetSales', {}, 'All sales deleted').then(render);
    }
  });

  var editId = null;
  function openEdit(id) {
    var it = S.items.filter(function (i) { return i.id === id; })[0]; if (!it) return; editId = id;
    $('e_name').value = it.name; $('e_owner').value = it.owner; $('e_price').value = it.price; $('e_qty').value = it.qty == null ? '' : it.qty;
    $('e_cat').innerHTML = catOptions(it.category || '');
    $('dlg').showModal();
  }
  $('e_cancel').onclick = function () { $('dlg').close(); };
  $('e_save').onclick = function () {
    act('updateItem', { id: editId, name: $('e_name').value, owner: $('e_owner').value, price: $('e_price').value, qty: $('e_qty').value, category: $('e_cat').value }, 'Item updated').then(function () { $('dlg').close(); render(); }).catch(function () { });
  };
  $('e_del').onclick = function () {
    if (!confirm('Delete this item?')) return;
    act('deleteItem', { id: editId }, 'Item deleted').then(function () { $('dlg').close(); if (ui.sel === editId) ui.sel = null; render(); }).catch(function () { });
  };

  /* ---------- login ---------- */
  function logoImg() { return '<img class="biglogo" src="img/logo.png" alt="" onerror="this.onerror=null;this.src=\'img/logo.svg\'">'; }
  function startSession(u) {
    ui.user = u; ui.tab = u.role === 'admin' ? 'home' : 'sell'; ui.animTab = true; ui.stagger = true;
    try { localStorage.setItem(SESSION, JSON.stringify({ id: u.id, date: today() })); } catch (e) { }
    $('auth').hidden = true; document.body.classList.remove('locked'); render();
  }
  function logout() { try { localStorage.removeItem(SESSION); } catch (e) { } ui.user = null; $('who').innerHTML = ''; showAuth(); }
  function authError(msg) { var c = $('auth').querySelector('.authcard'); $('autherr').textContent = msg; c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  function showAuth() {
    var a = $('auth'); a.hidden = false; document.body.classList.add('locked');
    $('title').textContent = S.settings.eventName || 'AMAYA Booth';
    if (!S.users.length) {
      a.innerHTML = '<div class="authcard">' + logoImg() + '<h2>Welcome!</h2><p class="muted">Create the admin account (president / treasurer). You can add cashiers afterwards.</p>' +
        '<label>Your name<input id="a_name" autocomplete="off"></label><label style="margin-top:8px">PIN (4-8 digits)<input id="a_pin" class="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>' +
        '<label style="margin-top:8px">Repeat PIN<input id="a_pin2" class="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>' +
        '<div class="err" id="autherr"></div><button class="btn big" id="a_go">Create admin &amp; start</button></div>';
      var go = function () {
        var pin = $('a_pin').value; if (!/^\d{4,8}$/.test(pin)) return authError('PIN must be 4 to 8 digits');
        if (pin !== $('a_pin2').value) return authError('PINs do not match');
        var salt = Math.random().toString(36).slice(2, 10);
        act('addUser', { name: $('a_name').value, role: 'admin', salt: salt, pinHash: Core.hashPin(salt, pin) }).then(function (st) { startSession(st.users[st.users.length - 1]); }).catch(function (e) { authError(e.message); });
      };
      $('a_go').onclick = go; a.querySelectorAll('input').forEach(function (i) { i.onkeydown = function (e) { if (e.key === 'Enter') go(); }; });
      return;
    }
    a.innerHTML = '<div class="authcard">' + logoImg() + '<h2>' + esc(S.settings.eventName || 'AMAYA Booth') + '</h2><p class="muted">Who is the cashier today?</p>' +
      '<label>Name<select id="l_user" class="f">' + S.users.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name) + ' (' + u.role + ')</option>'; }).join('') + '</select></label>' +
      '<label style="margin-top:8px">PIN<input id="l_pin" class="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></label>' +
      '<div class="err" id="autherr"></div><button class="btn big" id="l_go">Log in</button></div>';
    var login = function () {
      var u = S.users.filter(function (x) { return x.id === $('l_user').value; })[0];
      if (!u || Core.hashPin(u.salt, $('l_pin').value) !== u.pinHash) { $('l_pin').value = ''; return authError('Wrong PIN. Try again.'); }
      startSession(u);
    };
    $('l_go').onclick = login; $('l_pin').onkeydown = function (e) { if (e.key === 'Enter') login(); };
    setTimeout(function () { $('l_pin').focus(); }, 50);
  }
  function checkSession() {
    if (!S.users) S.users = [];
    try {
      var ss = JSON.parse(localStorage.getItem(SESSION) || 'null');
      var u = ss && ss.date === today() ? S.users.filter(function (x) { return x.id === ss.id; })[0] : null;
      if (u) { ui.user = u; ui.tab = u.role === 'admin' ? 'home' : 'sell'; $('auth').hidden = true; document.body.classList.remove('locked'); render(); return; }
    } catch (e) { }
    renderShell0(); showAuth();
  }
  function renderShell0() { $('who').innerHTML = ''; $('tabs').innerHTML = ''; $('view').innerHTML = ''; }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.full) { ui.full = false; render(); } });

  /* ---------- start ---------- */
  Store.init().then(function (s) {
    S = s; if (!S.users) S.users = []; dayInit(); checkSession();
    if (Store.mode === 'server') setInterval(function () {
      if ($('dlg').open || !ui.user) return;
      Store.poll().then(function (j) {
        if (!j || j.rev === S.rev) return; S = j; if (!S.users) S.users = [];
        var me = S.users.filter(function (x) { return x.id === ui.user.id; })[0];
        if (!me) return logout(); ui.user = me;
        if (ui.tab === 'sell') { catBar(); hscroll($('catbar')); chips(); cart(); recent(); renderShell(); }
        else if (ui.tab === 'items') { itemsTable(); renderShell(); }
        else if (['home', 'sales', 'sheet', 'payout'].indexOf(ui.tab) >= 0) render();
      }).catch(function () { });
    }, 5000);
  });
})();