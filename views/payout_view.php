<?php
/**
 * views/payout_view.php - display only.
 * Variables from PayoutController::index(): $scope ('all' or a day number), $rows, $totals, $days, $dayAction.
 */
$rate = $rows ? (float) $rows[0]['rate'] : 0;
?>
<form method="get" action="<?= e($base . $dayAction) ?>" class="seg" id="day" role="group" aria-label="Show payout for" style="margin-bottom:var(--s4)">
  <button type="submit" name="scope" value="all" class="<?= $scope === 'all' ? 'on' : '' ?>">All days</button>
  <?php foreach ($days as $d): ?>
    <button type="submit" name="scope" value="<?= (int) $d['day_no'] ?>" class="<?= (string) $d['day_no'] === $scope ? 'on' : '' ?>">Day <?= (int) $d['day_no'] ?></button>
  <?php endforeach; ?>
</form>

<div class="stats">
  <div class="stat"><span>Total sales</span><b><span class="mny"><i>P</i><?= e(number_format($totals['sales'], 2)) ?></span></b></div>
  <div class="stat"><span>Units sold</span><b class="qn"><?= (int) $totals['units'] ?></b></div>
  <div class="stat"><span>Booth keeps</span><b><span class="mny"><i>P</i><?= e(number_format($totals['booth_keeps'], 2)) ?></span></b></div>
  <div class="stat"><span>Owed to vendors</span><b><span class="mny"><i>P</i><?= e(number_format($totals['vendor_gets'], 2)) ?></span></b></div>
</div>

<div class="card slcard">
  <div class="cardbar sl-head">
    <h2>Payout per vendor</h2>
    <?php if ($rows): ?><span class="muted">Booth commission <?= e(rtrim(rtrim(number_format($rate, 2), '0'), '.')) ?>%</span><?php endif; ?>
  </div>

  <?php if (!$rows): ?>
    <div class="empty"><svg class="i"><use href="#pay"/></svg><p>No vendors yet</p><small>Vendors appear here once items are added.</small></div>
  <?php else: ?>
  <div class="sl-scroll">
    <table class="ptbl">
      <thead>
        <tr><th>Vendor</th><th class="n">Items sold</th><th class="n">Sales</th><th class="n">Booth keeps</th><th class="n">Vendor gets</th></tr>
      </thead>
      <tbody>
      <?php foreach ($rows as $r): ?>
        <tr>
          <td class="nm"><?= e($r['name']) ?><?php if ($r['is_house']): ?> <small class="muted">House</small><?php endif; ?></td>
          <td class="n q"><?= (int) $r['units'] ?></td>
          <td class="n m"><?= e(number_format($r['sales'], 2)) ?></td>
          <td class="n m"><?= e(number_format($r['booth_keeps'], 2)) ?></td>
          <?php if ($r['is_house']): ?>
            <td class="n muted">-</td>
          <?php else: ?>
            <td class="n m"><b><?= e(number_format($r['vendor_gets'], 2)) ?></b></td>
          <?php endif; ?>
        </tr>
      <?php endforeach; ?>
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td class="n q"><?= (int) $totals['units'] ?></td>
          <td class="n m"><?= e(number_format($totals['sales'], 2)) ?></td>
          <td class="n m"><?= e(number_format($totals['booth_keeps'], 2)) ?></td>
          <td class="n m"><b><?= e(number_format($totals['vendor_gets'], 2)) ?></b></td>
        </tr>
      </tfoot>
    </table>
  </div>
  <?php endif; ?>
</div>