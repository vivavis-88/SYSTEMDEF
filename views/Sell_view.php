<?php
/**
 * views/sell_view.php - display only.
 * Variables from SaleController::sell(): $items, $categories, $uncategorized, $recent,
 * $dayTotals, $preselect, $days, $day, $dayAction.
 */
$lowLimit = 3;
?>
<?php if (!$day): ?>
  <div class="card"><div class="empty"><svg class="i"><use href="#warn"/></svg><p>No selling days yet.</p><small>Ask the owner to add the event days in Settings.</small></div></div>
<?php else: ?>

<form method="get" action="<?= e($base . $dayAction) ?>" class="seg" id="day" role="group" aria-label="Selling day" style="margin-bottom:var(--s4)">
  <?php foreach ($days as $d): ?>
    <button type="submit" name="day" value="<?= (int) $d['day_no'] ?>" class="<?= (int) $d['day_no'] === (int) $day['day_no'] ? 'on' : '' ?>">Day <?= (int) $d['day_no'] ?></button>
  <?php endforeach; ?>
</form>

<div class="sellgrid">
  <!-- Items -->
  <div class="card col">
    <div class="cardbar"><h2 style="margin:0">Pick an item</h2><span class="muted"><?= count($items) ?> items</span></div>

    <?php if (!$items): ?>
      <div class="empty"><svg class="i"><use href="#items"/></svg><p>No items to sell yet.</p><small>Add items on the Items page first.</small></div>
    <?php else: ?>
      <div class="catbar" id="catbar">
        <button type="button" class="cbtn on" data-cat="">All <small><?= count($items) ?></small></button>
        <?php foreach ($categories as $c): ?>
          <button type="button" class="cbtn" data-cat="<?= (int) $c['id'] ?>" style="--cc:<?= e($c['color']) ?>"><?= e($c['name']) ?> <small><?= (int) $c['count'] ?></small></button>
        <?php endforeach; ?>
        <?php if ($uncategorized): ?>
          <button type="button" class="cbtn" data-cat="none">Uncategorized <small><?= (int) $uncategorized ?></small></button>
        <?php endif; ?>
      </div>

      <div class="chips" id="chips">
        <?php foreach ($items as $it):
            $low = $it['left'] !== null && $it['left'] <= $lowLimit; ?>
          <button type="button" class="chip<?= $low ? ' low' : '' ?>"
                  data-id="<?= (int) $it['id'] ?>"
                  data-name="<?= e($it['name']) ?>"
                  data-owner="<?= e($it['owner']) ?>"
                  data-category="<?= e($it['category'] ?? 'Uncategorized') ?>"
                  data-cat="<?= $it['category_id'] === null ? 'none' : (int) $it['category_id'] ?>"
                  data-price="<?= e(number_format((float) $it['price'], 2, '.', '')) ?>"
                  data-left="<?= $it['left'] === null ? '' : (int) $it['left'] ?>">
            <b><?= e($it['name']) ?></b>
            <small><?= e($it['owner']) ?> &middot; P<?= e(number_format((float) $it['price'], 2)) ?><?= $it['left'] === null ? '' : ' &middot; ' . (int) $it['left'] . ' left' ?></small>
          </button>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

  <!-- Add sale + recent -->
  <div class="col">
    <div class="card">
      <h2>Add sale</h2>
      <form method="post" action="<?= e($base) ?>/sell" id="sellForm" data-preselect="<?= (int) $preselect ?>" novalidate>
        <?= Csrf::field() ?>
        <input type="hidden" name="item_id" id="s_item" value="0">
        <input type="hidden" name="day_no" value="<?= (int) $day['day_no'] ?>">

        <div class="sel">
          <span class="seln" id="s_name">Choose an item</span>
          <span class="selm" id="s_meta">Tap an item on the left</span>
        </div>

        <div class="fields">
          <label>Price (P)
            <input type="number" name="price" id="price" min="0" step="0.01" inputmode="decimal" disabled>
          </label>
          <div class="qwrap">Quantity
            <div class="stepper">
              <button type="button" id="qMinus" aria-label="Less">&minus;</button>
              <div class="roll"><input type="number" name="qty" id="qty" min="1" max="9999" step="1" value="1" inputmode="numeric"></div>
              <button type="button" id="qPlus" aria-label="More">+</button>
            </div>
          </div>
        </div>

        <div class="totalbar"><span>Total</span><span class="total" id="s_total">P0.00</span></div>
        <p class="err" id="s_err" role="alert"></p>
        <button class="btn big" type="submit" id="s_btn" disabled>Add sale</button>
      </form>
    </div>

    <div class="card">
      <h2><?= e($day['label']) ?></h2>
      <div class="metric">
        <span class="mk">Sales today</span>
        <span class="mv"><span class="mny"><i>P</i><?= e(number_format((float) $dayTotals['total'], 2)) ?></span></span>
        <span class="ms"><?= (int) $dayTotals['units'] ?> units in <?= (int) $dayTotals['count'] ?> sales</span>
      </div>

      <?php if (!$recent): ?>
        <div class="empty"><svg class="i"><use href="#log"/></svg><p>No sales yet today.</p></div>
      <?php else: foreach ($recent as $r): ?>
        <div class="li">
          <div>
            <b><?= e($r['item_name']) ?> &times; <?= (int) $r['qty'] ?></b>
            <small><?= e($r['cashier']) ?> &middot; <?= e(date('g:i A', strtotime($r['sold_at']))) ?></small>
          </div>
          <div style="display:flex;align-items:center;gap:var(--s2)">
            <span class="mny"><i>P</i><?= e(number_format((float) $r['total'], 2)) ?></span>
            <?php if (!empty($r['can_delete'])): ?>
              <form method="post" action="<?= e($base) ?>/sales/delete" onsubmit="return confirm('Delete this sale?')">
                <?= Csrf::field() ?>
                <input type="hidden" name="sale_id" value="<?= (int) $r['id'] ?>">
                <input type="hidden" name="return" value="/sell">
                <button type="submit" class="link">Delete</button>
              </form>
            <?php endif; ?>
          </div>
        </div>
      <?php endforeach; endif; ?>
    </div>
  </div>
</div>

<script src="<?= e($base) ?>/assets/js/sell.js" defer></script>
<?php endif; ?>