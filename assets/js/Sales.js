/* Sales log page: DataTables search, sort and paging, plus the delete confirmation. */
(function () {
  'use strict';

  var EMPTY_ICON = '<svg class="i" aria-hidden="true"><use href="#log"/></svg>';

  function init() {
    var tbl = document.getElementById('salesTable');
    if (!tbl || !window.jQuery || !jQuery.fn.DataTable) return;

    jQuery(tbl).DataTable({
      pageLength: 15,
      lengthMenu: [10, 15, 25, 50],
      order: [[0, 'desc']],
      autoWidth: false,
      columnDefs: [{ orderable: false, targets: -1 }],
      // toolbar | scrolling table | footer (info left, pagination right)
      dom: "<'sl-bar'lf><'sl-scroll't><'sl-foot'ip>",
      language: {
        search: '',
        searchPlaceholder: 'Search item, owner or cashier',
        emptyTable: '<div class="empty">' + EMPTY_ICON + '<p>No sales recorded yet</p><small>Sales will appear here once a transaction is completed.</small></div>',
        zeroRecords: '<div class="empty">' + EMPTY_ICON + '<p>No matching sales</p><small>Try a different search term.</small></div>'
      }
    });

    var del = document.getElementById('saleDel');
    if (!del) return;
    del.addEventListener('show.bs.modal', function (ev) {
      var b = ev.relatedTarget;
      document.getElementById('sd_id').value = b ? b.getAttribute('data-id') : '0';
      document.getElementById('sd_name').textContent = b ? b.getAttribute('data-name') : '';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();