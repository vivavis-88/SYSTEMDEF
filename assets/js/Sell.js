/* Sell page: pick an item, set price and quantity, live total, category filter. */
(function () {
  'use strict';

  function init() {
    var form = document.getElementById('sellForm');
    if (!form) return;

    function $(id) { return document.getElementById(id); }
    var chips = [].slice.call(document.querySelectorAll('#chips .chip'));
    var cbtns = [].slice.call(document.querySelectorAll('#catbar .cbtn'));
    var idEl = $('s_item'), price = $('price'), qty = $('qty'), totalEl = $('s_total');
    var nameEl = $('s_name'), metaEl = $('s_meta'), btn = $('s_btn'), err = $('s_err');
    var cur = null;

    function money(n) {
      return 'P' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function qtyVal() { var q = parseInt(qty.value, 10); return isNaN(q) ? 0 : q; }
    function update() {
      var p = parseFloat(price.value), q = qtyVal();
      totalEl.textContent = money(cur && !isNaN(p) && q > 0 ? p * q : 0);
    }

    function select(chip) {
      cur = chip;
      chips.forEach(function (c) { c.classList.toggle('on', c === chip); });
      idEl.value = chip.getAttribute('data-id');
      price.disabled = false;
      price.value = chip.getAttribute('data-price');
      nameEl.textContent = chip.getAttribute('data-name');
      var left = chip.getAttribute('data-left');
      metaEl.textContent = chip.getAttribute('data-owner') + ' \u00b7 ' + chip.getAttribute('data-category') +
        (left === '' ? '' : ' \u00b7 ' + left + ' left');
      btn.disabled = false;
      err.textContent = '';
      update();
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { select(c); }); });

    /* category filter */
    cbtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.getAttribute('data-cat');
        cbtns.forEach(function (x) { x.classList.toggle('on', x === b); });
        chips.forEach(function (c) {
          c.hidden = !(cat === '' || c.getAttribute('data-cat') === cat);
        });
      });
    });

    /* quantity stepper */
    $('qMinus').addEventListener('click', function () { qty.value = Math.max(1, qtyVal() - 1); update(); });
    $('qPlus').addEventListener('click', function () { qty.value = Math.min(9999, qtyVal() + 1); update(); });
    qty.addEventListener('input', update);
    price.addEventListener('input', update);

    /* browser-side validation; the PHP model repeats every rule */
    form.addEventListener('submit', function (e) {
      var msg = '';
      var p = parseFloat(price.value);
      if (!cur) msg = 'Choose an item first.';
      else if (isNaN(p) || p < 0) msg = 'Enter a valid price.';
      else if (qtyVal() < 1) msg = 'Quantity must be 1 or more.';
      if (msg) { e.preventDefault(); err.textContent = msg; return; }
      btn.disabled = true;
    });

    /* open with an item already chosen (after adding a sale, the same item stays selected) */
    var pre = form.getAttribute('data-preselect');
    if (pre && pre !== '0') {
      chips.forEach(function (c) { if (c.getAttribute('data-id') === pre) { select(c); c.scrollIntoView({ block: 'nearest' }); } });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();