/* AMAYA Booth - motion + sound helpers. No dependencies; the app works fully if any of this is unavailable. */
(function () {
  'use strict';
  var RMQ = matchMedia('(prefers-reduced-motion:reduce)'), SKEY = 'amaya_sound', vals = {}, ids = {}, ctx = null, last = 0;
  var EASE = 'cubic-bezier(.22,.8,.3,1)';

  var FX = {
    reduced: function () { return RMQ.matches; },
    soundOn: function () { try { return localStorage.getItem(SKEY) !== 'off'; } catch (e) { return true; } },
    setSound: function (on) { try { localStorage.setItem(SKEY, on ? 'on' : 'off'); } catch (e) { } },

    /* Short mechanical snap: a 18ms filtered click plus a soft low "thock". Never overlaps itself. */
    snap: function () {
      if (!FX.soundOn()) return;
      var now = performance.now(); if (now - last < 160) return; last = now;
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ctx = ctx || new AC(); if (ctx.state === 'suspended') ctx.resume();
        var t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.018), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        var master = ctx.createGain(); master.gain.value = 0.2; master.connect(ctx.destination);
        var n = ctx.createBufferSource(); n.buffer = buf;
        var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.9;
        n.connect(bp); bp.connect(master); n.start(t);
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.09);
      } catch (e) { }
    },

    /* Odometer roll for the quantity field. dir>0: old number leaves upward, new enters from below. */
    roll: function (input, dir, from) {
      var box = input && input.parentNode; if (!box || !box.animate || FX.reduced()) return;
      [].forEach.call(box.querySelectorAll('.ghost'), function (g) { g.remove(); });
      input.getAnimations().forEach(function (a) { a.cancel(); });
      var g = document.createElement('span'); g.className = 'ghost'; g.setAttribute('aria-hidden', 'true'); g.textContent = from; box.appendChild(g);
      var o = { duration: 240, easing: EASE }, up = dir > 0;
      var a = g.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + (up ? '-100%' : '100%') + ')', opacity: 0 }], o);
      a.onfinish = a.oncancel = function () { g.remove(); };
      input.animate([{ transform: 'translateY(' + (up ? '100%' : '-100%') + ')', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], o);
    },

    /* Count a number toward its new value. The final text is always the exact value. */
    count: function (el, key, to, fmt, dur) {
      if (!el) return;
      var from = vals[key]; vals[key] = to;
      if (from == null || from === to || FX.reduced()) { el.innerHTML = fmt(to); return; }
      var id = ids[key] = (ids[key] || 0) + 1, t0 = performance.now(); dur = dur || 260;
      (function f(n) {
        if (ids[key] !== id) return;
        var t = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - t, 3);
        el.innerHTML = fmt(t < 1 ? from + (to - from) * e : to);
        if (t < 1) requestAnimationFrame(f);
      })(t0);
    },
    forget: function (key) { delete vals[key]; ids[key] = (ids[key] || 0) + 1; },
    pop: function (el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  };

  /* Sound whitelist: only elements marked data-snd ever make a sound. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-snd]');
    if (b && !b.disabled) FX.snap();
  }, true);

  window.FX = FX;
})();