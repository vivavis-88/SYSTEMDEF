/* Items page: DataTables (search, sort, paging), filter bar, Add / Edit and Delete modals.
   Loaded with "defer", so jQuery, Bootstrap and DataTables from the footer are already available. */
(function () {
  'use strict';

  function empty(title, hint) {
    return '<div class="empty"><svg class="i" aria-hidden="true"><use href="#items"/></svg><p>' + title + '</p><small>' + hint + '</small></div>';
  }

  function init() {
    var tbl = document.getElementById('itemsTable');
    if (!tbl || !window.jQuery || !jQuery.fn.DataTable) return;

    var low = parseInt(tbl.getAttribute('data-low'), 10) || 3;
    var dt = jQuery(tbl).DataTable({
      pageLength: 15,
      lengthMenu: [10, 15, 25, 50],
      order: [[1, 'asc'], [0, 'asc']],
      autoWidth: false,
      columnDefs: [{ orderable: false, targets: -1 }],
      // toolbar | scrolling table | footer (info left, pagination right)
      dom: "<'sl-bar'lf><'sl-scroll't><'sl-foot'ip>",
      language: {
        search: '',
        searchPlaceholder: 'Search item or owner',
        emptyTable: empty('No items yet', 'Add your first item to start selling.'),
        zeroRecords: empty('No matching items', 'Try a different search or clear the filters.')
      }
    });

    /* ----- filters ----- */
    function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function exact(id, col) {
      var el = document.getElementById(id);
      el.addEventListener('change', function () {
        dt.column(col).search(el.value ? '^' + esc(el.value) + '$' : '', true, false).draw();
      });
    }
    exact('fVendor', 1);
    exact('fCat', 2);
    exact('fType', 3);

    var stock = document.getElementById('fStock');
    jQuery.fn.dataTable.ext.search.push(function (settings, data, idx) {
      if (settings.nTable !== tbl || !stock.value) return true;
      var node = dt.row(idx).node();
      var raw = node ? node.getAttribute('data-left') : '';
      var tracked = raw !== '';
      var left = tracked ? parseInt(raw, 10) : 0;
      switch (stock.value) {
        case 'low':       return tracked && left <= low;
        case 'out':       return tracked && left <= 0;
        case 'ok':        return tracked && left > low;
        case 'untracked': return !tracked;
      }
      return true;
    });
    stock.addEventListener('change', function () { dt.draw(); });

    document.getElementById('fClear').addEventListener('click', function () {
      ['fVendor', 'fCat', 'fType', 'fStock'].forEach(function (id) { document.getElementById(id).value = ''; });
      dt.columns().search('');
      dt.search('').draw();
    });

    /* ----- Add / Edit modal ----- */
    var modal = document.getElementById('itemModal');
    var form = document.getElementById('itemForm');
    var err = document.getElementById('i_err');
    function f(id) { return document.getElementById(id); }

    modal.addEventListener('show.bs.modal', function (ev) {
      var b = ev.relatedTarget;
      var editing = b && b.getAttribute('data-id');
      err.textContent = '';
      f('itemModalTitle').textContent = editing ? 'Edit item' : 'Add item';
      f('i_id').value = editing ? b.getAttribute('data-id') : '0';
      f('i_name').value = editing ? b.getAttribute('data-name') : '';
      f('i_price').value = editing ? b.getAttribute('data-price') : '';
      f('i_qty').value = editing ? b.getAttribute('data-qty') : '';
      f('i_cat').value = editing ? b.getAttribute('data-category') : '0';
      f('i_type').value = editing ? b.getAttribute('data-type') : '0';
      if (editing) f('i_vendor').value = b.getAttribute('data-vendor');
      else if (f('i_vendor').options.length) f('i_vendor').selectedIndex = 0;
    });
    modal.addEventListener('shown.bs.modal', function () { f('i_name').focus(); });

    /* Browser-side validation; the PHP model repeats every rule. */
    form.addEventListener('submit', function (e) {
      var name = f('i_name').value.trim();
      var price = f('i_price').value.trim();
      var qty = f('i_qty').value.trim();
      var msg = '';
      if (name.length < 1 || name.length > 120) msg = 'Item name must be 1 to 120 characters.';
      else if (price === '' || isNaN(price) || parseFloat(price) < 0) msg = 'Enter a price of 0 or more.';
      else if (qty !== '' && !/^\d+$/.test(qty)) msg = 'Starting quantity must be a whole number, or left blank.';
      if (msg) {
        e.preventDefault();
        err.textContent = msg;
      }
    });

    /* ----- Delete modal ----- */
    var del = document.getElementById('delModal');
    del.addEventListener('show.bs.modal', function (ev) {
      var b = ev.relatedTarget;
      f('d_id').value = b ? b.getAttribute('data-id') : '0';
      f('d_name').textContent = b ? b.getAttribute('data-name') : '';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();