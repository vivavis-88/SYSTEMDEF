<?php
/**
 * views/sales_view.php - display only.
 * Variables from SaleController::index(): $scope ('all' or a day number), $rows, $totals, $days, $day, $dayAction.
 */
?>
<form method="get" action="<?= e($base . $dayAction) ?>" class="seg" id="day" role="group" aria-label="Show sales for" style="margin-bottom:var(--s4)">
  <button type="submit" name="scope" value="all" class="<?= $scope === 'all' ? 'on' : '' ?>">All days</button>
  <?php foreach ($days as $d): ?>
    <button type="submit" name="scope" value="<?= (int) $d['day_no'] ?>" class="<?= (string) $d['day_no'] === $scope ? 'on' : '' ?>">Day <?= (int) $d['day_no'] ?></button>
  <?php endforeach; ?>
</form>

<div class="stats">
  <div class="stat"><span>Sales</span><b><?= (int) $totals['count'] ?></b></div>
  <div class="stat"><span>Units sold</span><b class="qn"><?= (int) $totals['units'] ?></b></div>
  <div class="stat"><span>Total</span><b><span class="mny"><i>P</i><?= e(number_format((float) $totals['total'], 2)) ?></span></b></div>
</div>

<div class="card slcard">
  <div class="cardbar sl-head"><h2>Sales log</h2></div>
    <table id="salesTable">
      <thead>
        <tr>
          <th>Time</th><th>Day</th><th>Item</th><th>Owner</th><th>Cashier</th>
          <th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th><th class="n">Actions</th>
        </tr>
      </thead>
      <tbody>
      <?php foreach ($rows as $r): ?>
        <tr>
          <td data-order="<?= e(strtotime($r['sold_at'])) ?>"><?= e(date('M j, g:i A', strtotime($r['sold_at']))) ?></td>
          <td>Day <?= (int) $r['day_no'] ?></td>
          <td class="nm"><?= e($r['item_name']) ?></td>
          <td><?= e($r['owner']) ?></td>
          <td><?= e($r['cashier']) ?></td>
          <td class="n q"><?= (int) $r['qty'] ?></td>
          <td class="n m"><?= e(number_format((float) $r['unit_price'], 2)) ?></td>
          <td class="n m"><b><?= e(number_format((float) $r['total'], 2)) ?></b></td>
          <td class="n">
            <?php if (!empty($r['can_delete'])): ?>
              <button type="button" class="link" data-bs-toggle="modal" data-bs-target="#saleDel"
                      data-id="<?= (int) $r['id'] ?>"
                      data-name="<?= e($r['item_name'] . ' x ' . (int) $r['qty']) ?>">Delete</button>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
</div>

<!-- Delete confirmation -->
<div class="modal fade" id="saleDel" tabindex="-1" aria-labelledby="saleDelTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <form class="modal-content" method="post" action="<?= e($base) ?>/sales/delete">
      <?= Csrf::field() ?>
      <input type="hidden" name="sale_id" id="sd_id" value="0">
      <input type="hidden" name="return" value="/sales">
      <div class="modal-header">
        <h2 class="modal-title" id="saleDelTitle" style="font-size:17px;margin:0">Delete sale</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body"><p>Delete <b id="sd_name"></b>? This cannot be undone.</p></div>
      <div class="modal-footer">
        <button type="button" class="btn alt" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn red">Delete</button>
      </div>
    </form>
  </div>
</div>

<script src="<?= e($base) ?>/assets/js/sales.js" defer></script>