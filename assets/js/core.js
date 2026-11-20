/* AMAYA Booth - core logic (shared by browser and tests). No DOM here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var DEFAULT_DAYS = 4;
  function numDays(s) { var n = Math.floor(Number(s.settings.numDays)) || DEFAULT_DAYS; s.sales.forEach(function (x) { if (x.day > n) n = x.day; }); return Math.max(1, n); }
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }
  function num(x) { x = parseFloat(x); return isFinite(x) ? x : 0; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function T(x) { return String(x == null ? '' : x).trim(); }
  function key(x) { return T(x).toLowerCase(); }

  function emptyState() {
    return {
      rev: 0,
      settings: { eventName: 'AMAYA Booth', numDays: 4, shareRate: 15, amayaOwners: 'AMAYA', days: { 1: '2026-11-10', 2: '2026-11-11', 3: '2026-11-12', 4: '2026-11-13' } },
      users: [], categories: [], items: [], sales: []
    };
  }

  var PALETTE = ['#7c3aed', '#db2777', '#0891b2', '#16a34a', '#ea580c', '#ca8a04', '#2563eb', '#dc2626', '#0d9488', '#64748b'];
  function starterCat(n, o) {
    n = n.toLowerCase();
    if (/photobooth|face paint|henna/.test(n)) return 'Services';
    if (o === 'AMAYA' && !/sticker/.test(n)) return 'Games';
    if (/sticker|pin|card/.test(n)) return 'Pins & Stickers';
    if (/keychain|charm/.test(n)) return 'Keychains';
    if (/bracelet/.test(n)) return 'Bracelets';
    if (/doodle|portrait/.test(n)) return 'Art';
    return '';
  }
  var STARTER = [
    ['Face paint', 'AMAYA', 20, null], ['PhotoBooth - Soft copy', 'AMAYA', 20, null], ['PhotoBooth - Hard copy', 'AMAYA', 30, null],
    ['PhotoBooth - Soft + Hard + free sticker', 'AMAYA', 50, null], ['Human Slot Machine', 'AMAYA', 10, null], ['Spin the Wheel', 'AMAYA', 10, null],
    ['String Vending Machine', 'AMAYA', 10, null], ['String Vending Machine (P5)', 'AMAYA', 5, null], ['Cut the Prize', 'AMAYA', 10, null], ['AMAYA Stickers', 'AMAYA', 5, null],
    ['Henna Tattoo (P20)', 'Erika', 20, null], ['Henna Tattoo (P25)', 'Erika', 25, null], ['Henna Tattoo (P30)', 'Erika', 30, null],
    ['Doodle Art', 'Dan', 20, null], ['Portrait drawing / frame', 'Dan', 250, null],
    ['Pins', 'Khurt', 40, 63],
    ['Keychain Bouquet', 'Sofia', 60, 19], ['Bracelet', 'Sofia', 50, 63], ['Butterfly keychain', 'Sofia', 60, 8],
    ['Bracelet (Big)', 'Alyssa', 30, 12], ['Bracelet (Small)', 'Alyssa', 15, 3], ['Flower keychain', 'Alyssa', 20, 3], ['Keychain', 'Alyssa', 20, 12],
    ['Keychain Charms', 'Joshualyn', 50, 12],
    ['Memon Cards', 'Mecaela', 20, 30], ['Customized Stickers', 'Mecaela', 10, null],
    ['Bracelet (P30)', 'Therese', 30, null], ['Bracelet (P40)', 'Therese', 40, null], ['Bracelet (P50)', 'Therese', 50, null],
    ['Totem of Undying Keychain', 'Shane', 30, 19], ['Anime Eye Keychain', 'Shane', 45, 8], ['Cat Pin', 'Shane', 30, 28], ['Minions Keychain', 'Shane', 25, 30], ['Cute Animal Keychain', 'Shane', 25, 27]
  ].map(function (a) { return { name: a[0], owner: a[1], price: a[2], qty: a[3], categoryName: starterCat(a[0], a[1]) }; });

  function okColor(c, i) { return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c).toLowerCase() : PALETTE[(i || 0) % PALETTE.length]; }
  function ensureCategory(s, name) {
    name = T(name); if (!name) return '';
    var f = s.categories.filter(function (c) { return key(c.name) === key(name); })[0];
    if (f) return f.id;
    var c = { id: uid(), name: name, color: PALETTE[s.categories.length % PALETTE.length] }; s.categories.push(c); return c.id;
  }
  function cleanItem(d, s) {
    var name = T(d.name), owner = T(d.owner);
    if (!name) throw new Error('Item name is required.');
    if (!owner) throw new Error('Owner is required.');
    var qty = (d.qty === '' || d.qty == null) ? null : Math.max(0, Math.floor(num(d.qty)));
    var cat = '';
    if (d.category && s && (s.categories || []).some(function (c) { return c.id === d.category; })) cat = d.category;
    return { name: name, owner: owner, price: Math.max(0, r2(num(d.price))), qty: qty, category: cat };
  }
  function sameItem(a, b) { return key(a.name) === key(b.name) && key(a.owner) === key(b.owner) && a.price === b.price; }

  function hashPin(salt, pin) {
    var str = 'amaya|' + salt + '|' + pin, h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) { var ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function adminCount(s) { return s.users.filter(function (u) { return u.role === 'admin'; }).length; }

  function applyOp(s, op, d) {
    d = d || {}; if (!s.users) s.users = []; if (!s.categories) s.categories = [];
    var find = function (id) { return s.items.find(function (i) { return i.id === id; }); };
    switch (op) {
      case 'addItem': {
        var it = cleanItem(d, s);
        if (s.items.some(function (i) { return sameItem(i, it); })) throw new Error('That item already exists.');
        it.id = uid(); s.items.push(it); break;
      }
      case 'addItemsBulk': {
        (d.items || []).forEach(function (raw) {
          var n = cleanItem(raw, s);
          if (raw.categoryName) n.category = ensureCategory(s, raw.categoryName);
          var ex = s.items.filter(function (i) { return sameItem(i, n); })[0];
          if (!ex) { n.id = uid(); s.items.push(n); } else if (!ex.category && n.category) ex.category = n.category;
        }); break;
      }
      case 'updateItem': {
        var cur = find(d.id); if (!cur) throw new Error('Item not found.');
        var n2 = cleanItem(d, s);
        cur.name = n2.name; cur.owner = n2.owner; cur.price = n2.price; cur.qty = n2.qty;
        if (d.category !== undefined) cur.category = n2.category;
        s.sales.forEach(function (x) { if (x.itemId === cur.id) { x.itemName = cur.name; x.owner = cur.owner; } });
        break;
      }
      case 'deleteItem': {
        if (s.sales.some(function (x) { return x.itemId === d.id; })) throw new Error('This item already has sales. Delete those sales first.');
        s.items = s.items.filter(function (i) { return i.id !== d.id; }); break;
      }
      case 'addSale': {
        var item = find(d.itemId); if (!item) throw new Error('Pick an item first.');
        var qty = Math.floor(num(d.qty)); if (qty < 1) throw new Error('Quantity must be at least 1.');
        var price = (d.price === undefined || d.price === null || d.price === '') ? item.price : Math.max(0, num(d.price));
        var day = Math.floor(num(d.day)) || 1;
        s.sales.push({ id: uid(), ts: d.ts || new Date().toISOString(), day: day, itemId: item.id, itemName: item.name, owner: item.owner, price: price, qty: qty, total: r2(price * qty), cashier: T(d.cashier) });
        break;
      }
      case 'deleteSale': s.sales = s.sales.filter(function (x) { return x.id !== d.id; }); break;
      case 'setSettings': {
        var st = s.settings;
        if (d.eventName !== undefined) st.eventName = T(d.eventName) || 'AMAYA Booth';
        if (d.shareRate !== undefined) st.shareRate = Math.min(100, Math.max(0, num(d.shareRate)));
        if (d.amayaOwners !== undefined) st.amayaOwners = T(d.amayaOwners);
        if (d.days) for (var k in d.days) st.days[k] = T(d.days[k]);
        break;
      }
      case 'addDay': {
        var n = numDays(s) + 1, prev = s.settings.days[n - 1] || '', nd = '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(prev)) { var dt = new Date(prev + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + 1); nd = dt.toISOString().slice(0, 10); }
        s.settings.numDays = n; s.settings.days[n] = nd; break;
      }
      case 'removeDay': {
        var m = numDays(s); if (m <= 1) throw new Error('You need at least one day.');
        if (s.sales.some(function (x) { return x.day === m; })) throw new Error('Day ' + m + ' has sales. Delete them first.');
        delete s.settings.days[m]; s.settings.numDays = m - 1; break;
      }
      case 'addCategory': {
        var cn = T(d.name); if (!cn) throw new Error('Category name is required.');
        if (s.categories.some(function (c) { return key(c.name) === key(cn); })) throw new Error('That category already exists.');
        s.categories.push({ id: uid(), name: cn, color: okColor(d.color, s.categories.length) }); break;
      }
      case 'updateCategory': {
        var cc = s.categories.filter(function (c) { return c.id === d.id; })[0]; if (!cc) throw new Error('Category not found.');
        if (d.name !== undefined) {
          var nn = T(d.name); if (!nn) throw new Error('Category name is required.');
          if (s.categories.some(function (c) { return c.id !== cc.id && key(c.name) === key(nn); })) throw new Error('That category already exists.');
          cc.name = nn;
        }
        if (d.color !== undefined) cc.color = okColor(d.color, 0);
        break;
      }
      case 'deleteCategory': {
        s.categories = s.categories.filter(function (c) { return c.id !== d.id; });
        s.items.forEach(function (i) { if (i.category === d.id) i.category = ''; }); break;
      }
      case 'setItemCategory': {
        var si = find(d.id); if (!si) throw new Error('Item not found.');
        si.category = (d.category && s.categories.some(function (c) { return c.id === d.category; })) ? d.category : ''; break;
      }
      case 'addUser': {
        var nm = T(d.name); if (!nm) throw new Error('Name is required.');
        if (!d.pinHash || !d.salt) throw new Error('PIN is required.');
        if (['admin', 'cashier'].indexOf(d.role) < 0) throw new Error('Pick a role.');
        if (s.users.some(function (u) { return key(u.name) === key(nm); })) throw new Error('That name is already used.');
        s.users.push({ id: uid(), name: nm, role: d.role, salt: d.salt, pinHash: d.pinHash }); break;
      }
      case 'updateUser': {
        var u = s.users.filter(function (x) { return x.id === d.id; })[0]; if (!u) throw new Error('Person not found.');
        if (d.role && d.role !== u.role) { if (u.role === 'admin' && adminCount(s) < 2) throw new Error('Keep at least one admin.'); u.role = d.role; }
        if (d.pinHash && d.salt) { u.salt = d.salt; u.pinHash = d.pinHash; }
        break;
      }
      case 'deleteUser': {
        var du = s.users.filter(function (x) { return x.id === d.id; })[0]; if (!du) throw new Error('Person not found.');
        if (du.role === 'admin' && adminCount(s) < 2) throw new Error('Keep at least one admin.');
        s.users = s.users.filter(function (x) { return x.id !== d.id; }); break;
      }
      case 'resetSales': s.sales = []; break;
      case 'importAll': {
        var im = d.state; if (!im || !Array.isArray(im.items) || !Array.isArray(im.sales)) throw new Error('That file is not a valid backup.');
        s.settings = im.settings || s.settings; s.items = im.items; s.sales = im.sales; if (Array.isArray(im.users)) s.users = im.users; if (Array.isArray(im.categories)) s.categories = im.categories; break;
      }
      default: throw new Error('Unknown action.');
    }
    s.rev = (s.rev || 0) + 1;
    return s;
  }

  function scopeOf(scope) { return scope === 'all' ? 'all' : Number(scope); }
  function inScope(x, sc) { return sc === 'all' || x.day === sc; }

  function itemRows(s, scope) {
    var sc = scopeOf(scope);
    return s.items.map(function (it) {
      var sold = 0, sales = 0, cum = 0;
      s.sales.forEach(function (x) {
        if (x.itemId !== it.id) return;
        if (inScope(x, sc)) { sold += x.qty; sales += x.total; }
        if (sc === 'all' || x.day <= sc) cum += x.qty;
      });
      return { id: it.id, name: it.name, owner: it.owner, category: it.category || '', price: it.price, qty: it.qty, sold: sold, sales: r2(sales), left: it.qty == null ? null : it.qty - cum };
    });
  }

  function groups(s, scope) {
    var rows = itemRows(s, scope), map = {}, order = [];
    rows.forEach(function (r) {
      var k = key(r.owner);
      if (!map[k]) { map[k] = { owner: r.owner, rows: [], sales: 0, sold: 0 }; order.push(k); }
      map[k].rows.push(r); map[k].sales = r2(map[k].sales + r.sales); map[k].sold += r.sold;
    });
    return order.map(function (k) { return map[k]; });
  }

  function isAmaya(s, owner) {
    var list = String(s.settings.amayaOwners || '').split(',').map(key).filter(Boolean);
    return list.indexOf(key(owner)) >= 0;
  }

  function payout(s, scope) {
    var sc = scopeOf(scope), rate = num(s.settings.shareRate), map = {}, order = [];
    s.items.forEach(function (i) { var k = key(i.owner); if (!map[k]) { map[k] = { owner: i.owner, sales: 0, qty: 0 }; order.push(k); } });
    s.sales.forEach(function (x) {
      if (!inScope(x, sc)) return;
      var k = key(x.owner); if (!map[k]) { map[k] = { owner: x.owner, sales: 0, qty: 0 }; order.push(k); }
      map[k].sales += x.total; map[k].qty += x.qty;
    });
    var tot = { sales: 0, amayaOwn: 0, amayaCut: 0, owners: 0 };
    var rows = order.map(function (k) {
      var m = map[k], am = isAmaya(s, m.owner), sales = r2(m.sales);
      var share = am ? sales : r2(sales * rate / 100), gets = am ? 0 : r2(sales - share);
      tot.sales += sales; tot.owners += gets;
      if (am) tot.amayaOwn += sales; else tot.amayaCut += share;
      return { owner: m.owner, qty: m.qty, sales: sales, isAmaya: am, rate: am ? 100 : rate, share: share, gets: gets };
    });
    tot.sales = r2(tot.sales); tot.owners = r2(tot.owners); tot.amayaOwn = r2(tot.amayaOwn); tot.amayaCut = r2(tot.amayaCut);
    tot.amaya = r2(tot.amayaOwn + tot.amayaCut);
    return { rows: rows, total: tot, rate: rate };
  }

  function scopeSales(s, scope) {
    var sc = scopeOf(scope);
    return s.sales.filter(function (x) { return inScope(x, sc); }).sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; });
  }

  function dateLabel(iso) {
    if (!iso) return '';
    var p = String(iso).split('-'); if (p.length !== 3) return iso;
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(p[1]) - 1];
    return m + ' ' + Number(p[2]) + ', ' + p[0];
  }
  function scopeLabel(s, scope) {
    if (scope === 'all') return 'All days';
    var d = s.settings.days[scope];
    return 'Day ' + scope + (d ? ' - ' + dateLabel(d) : '');
  }
  function money(n) { return (Math.round(num(n) * 100) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fileTag(s, scope) { return scope === 'all' ? 'AllDays' : 'Day' + scope + (s.settings.days[scope] ? '_' + s.settings.days[scope] : ''); }

  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCsv(rows) { return '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n'; }
  function timeOf(ts) { var d = new Date(ts); return isNaN(d) ? '' : ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  function salesRows(s, scope) {
    var rows = [['Day', 'Date', 'Time', 'Item', 'Owner', 'Qty', 'Price', 'Total', 'Cashier']];
    scopeSales(s, scope).forEach(function (x) { rows.push([x.day, s.settings.days[x.day] || '', timeOf(x.ts), x.itemName, x.owner, x.qty, x.price, x.total, x.cashier || '']); });
    return rows;
  }
  function payoutRows(s, scope) {
    var p = payout(s, scope), rows = [['Owner', 'Items sold', 'Sales', 'AMAYA %', 'AMAYA share', 'Owner gets']];
    p.rows.forEach(function (r) { rows.push([r.owner, r.qty, r.sales, r.rate, r.share, r.gets]); });
    rows.push(['TOTAL', '', p.total.sales, '', p.total.amaya, p.total.owners]);
    return rows;
  }
  function cashierTotals(s, scope) {
    var map = {}, order = [];
    scopeSales(s, scope).forEach(function (x) {
      var n = x.cashier || '(not recorded)'; if (!map[n]) { map[n] = { name: n, entries: 0, qty: 0, total: 0 }; order.push(n); }
      map[n].entries++; map[n].qty += x.qty; map[n].total = r2(map[n].total + x.total);
    });
    return order.map(function (n) { return map[n]; });
  }
  function categoryTotals(s, scope) {
    var cat = {}; (s.categories || []).forEach(function (c) { cat[c.id] = c; });
    var map = {}, itemCat = {}; s.items.forEach(function (i) { itemCat[i.id] = cat[i.category] ? i.category : ''; });
    scopeSales(s, scope).forEach(function (x) {
      var id = itemCat[x.itemId] || ''; if (!map[id]) map[id] = { id: id, name: id ? cat[id].name : '(no category)', color: id ? cat[id].color : '#94a3b8', qty: 0, total: 0 };
      map[id].qty += x.qty; map[id].total = r2(map[id].total + x.total);
    });
    var out = []; (s.categories || []).forEach(function (c) { if (map[c.id]) out.push(map[c.id]); }); if (map['']) out.push(map['']);
    return out;
  }
  function categoryRows(s, scope) {
    var rows = [['Category', 'Items sold', 'Sales']];
    categoryTotals(s, scope).forEach(function (c) { rows.push([c.name, c.qty, c.total]); });
    return rows;
  }
  function cashierRows(s, scope) {
    var rows = [['Cashier', 'Entries', 'Items sold', 'Sales']];
    cashierTotals(s, scope).forEach(function (c) { rows.push([c.name, c.entries, c.qty, c.total]); });
    return rows;
  }
  function sheetRows(s, scope) {
    var cn = {}; (s.categories || []).forEach(function (c) { cn[c.id] = c.name; });
    var rows = [['Owner', 'Products', 'Category', 'Price', 'Whole quantity', 'Sold', 'Remaining', 'Total sold item', 'Whole Sales']];
    groups(s, scope).forEach(function (g) {
      g.rows.forEach(function (r, i) { rows.push([i === 0 ? g.owner : '', r.name, cn[r.category] || '', r.price, r.qty == null ? '' : r.qty, r.sold, r.left == null ? '' : r.left, r.sales, i === 0 ? g.sales : '']); });
    });
    return rows;
  }

  function pad(str, n) { str = String(str); return str.length >= n ? str.slice(0, n) : str + ' '.repeat(n - str.length); }
  function lpad(str, n) { str = String(str); return str.length >= n ? str : ' '.repeat(n - str.length) + str; }

  function receiptText(s, scope) {
    var W = 44, line = '-'.repeat(W), dbl = '='.repeat(W), out = [];
    var center = function (t) { return ' '.repeat(Math.max(0, Math.floor((W - t.length) / 2))) + t; };
    out.push(dbl, center(s.settings.eventName.toUpperCase()), center('SALES RECEIPT - ' + scopeLabel(s, scope).toUpperCase()), center('Printed: ' + new Date().toLocaleString('en-PH')), dbl);
    var g = groups(s, scope).filter(function (x) { return x.sold > 0; });
    if (!g.length) out.push('(no sales recorded)');
    g.forEach(function (grp) {
      out.push('OWNER: ' + grp.owner);
      grp.rows.filter(function (r) { return r.sold > 0; }).forEach(function (r) {
        out.push('  ' + pad(r.name, 24) + lpad('x' + r.sold, 5) + lpad(money(r.sales), 13));
      });
      out.push(pad('  Subtotal', 31) + lpad(money(grp.sales), 13), line);
    });
    var p = payout(s, scope);
    out.push('PAYOUT (AMAYA share ' + p.rate + '% of owners\' sales)');
    p.rows.filter(function (r) { return r.sales > 0; }).forEach(function (r) {
      out.push(pad('  ' + r.owner, 18) + lpad(money(r.sales), 12) + lpad(r.isAmaya ? 'AMAYA' : money(r.gets), 14));
    });
    var ct = cashierTotals(s, scope);
    if (ct.length) { out.push(line, 'CASHIERS'); ct.forEach(function (c) { out.push(pad('  ' + c.name, 18) + lpad(c.entries + ' sales', 12) + lpad(money(c.total), 14)); }); }
    out.push(line, pad('TOTAL SALES', 31) + lpad(money(p.total.sales), 13));
    out.push(pad('AMAYA income (booths + share)', 31) + lpad(money(p.total.amaya), 13));
    out.push(pad('To pay out to owners', 31) + lpad(money(p.total.owners), 13), dbl);
    return out.join('\r\n') + '\r\n';
  }

  function xlsxSheets(s, scope) {
    var p = payoutRows(s, scope), sh = sheetRows(s, scope), sl = salesRows(s, scope);
    var daily = [['Day', 'Date', 'Items sold', 'Sales']];
    for (var d = 1; d <= numDays(s); d++) {
      var xs = scopeSales(s, d), q = 0, t = 0; xs.forEach(function (x) { q += x.qty; t += x.total; });
      daily.push([d, s.settings.days[d] || '', q, r2(t)]);
    }
    return [
      { name: 'Sheet', rows: sh, bold: [0], widths: [14, 36, 16, 8, 15, 8, 11, 15, 12] },
      { name: 'Categories', rows: categoryRows(s, scope), bold: [0], widths: [20, 11, 12] },
      { name: 'Sales log', rows: sl, bold: [0], widths: [6, 12, 8, 36, 14, 6, 8, 10, 14] },
      { name: 'Cashiers', rows: cashierRows(s, scope), bold: [0], widths: [18, 9, 11, 12] },
      { name: 'Payout', rows: p, bold: [0, p.length - 1], widths: [16, 11, 12, 10, 13, 13] },
      { name: 'Daily totals', rows: daily, bold: [0], widths: [6, 12, 11, 12] }
    ];
  }

  return {
    numDays: numDays, hashPin: hashPin, categoryTotals: categoryTotals, PALETTE: PALETTE, cashierTotals: cashierTotals, STARTER: STARTER, emptyState: emptyState, applyOp: applyOp, itemRows: itemRows, groups: groups, payout: payout,
    scopeSales: scopeSales, scopeLabel: scopeLabel, dateLabel: dateLabel, money: money, fileTag: fileTag, toCsv: toCsv, timeOf: timeOf,
    salesRows: salesRows, payoutRows: payoutRows, sheetRows: sheetRows, receiptText: receiptText, xlsxSheets: xlsxSheets, isAmaya: isAmaya
  };
});