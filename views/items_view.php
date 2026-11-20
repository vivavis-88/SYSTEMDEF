<?php
/**
 * views/items_view.php - display only. Variables: $items, $options, $itemCount, $lowCount, $lowLimit.
 * Bootstrap modals for Add / Edit and Delete; DataTables for search, sort and paging.
 */
$noVendors = empty($options['vendors']);
?>
<div class="stats" id="istats">
  <div class="stat"><span>Items</span><b><?= (int) $itemCount ?></b></div>
  <div class="stat"><span>Running low (<?= (int) $lowLimit ?> or fewer left)</span><b class="<?= $lowCount ? 'low' : '' ?>"><?= (int) $lowCount ?></b></div>
</div>

<div class="card slcard">
  <div class="cardbar sl-head">
    <h2>Item log</h2>
    <button type="button" class="btn sm" data-bs-toggle="modal" data-bs-target="#itemModal"<?= $noVendors ? ' disabled' : '' ?>>Add item</button>
  </div>

  <?php if ($noVendors): ?>
    <p class="muted sl-note">This workspace has no owner yet. Create a vendor (the House vendor) before adding items.</p>
  <?php endif; ?>

  <div class="row sl-filters">
    <label>Owner
      <select class="f" id="fVendor"><option value="">All</option>
        <?php foreach ($options['vendors'] as $v): ?><option value="<?= e($v['name']) ?>"><?= e($v['name']) ?></option><?php endforeach; ?>
      </select>
    </label>
    <label>Category
      <select class="f" id="fCat"><option value="">All</option>
        <?php foreach ($options['categories'] as $c): ?><option value="<?= e($c['name']) ?>"><?= e($c['name']) ?></option><?php endforeach; ?>
        <option value="Uncategorized">Uncategorized</option>
      </select>
    </label>
    <label>Type
      <select class="f" id="fType"><option value="">All</option>
        <?php foreach ($options['types'] as $t): ?><option value="<?= e($t['label']) ?>"><?= e($t['label']) ?></option><?php endforeach; ?>
        <option value="None">None</option>
      </select>
    </label>
    <label>Stock
      <select class="f" id="fStock">
        <option value="">All</option>
        <option value="low">Running low</option>
        <option value="out">Sold out</option>
        <option value="ok">In stock</option>
        <option value="untracked">Not counted</option>
      </select>
    </label>
    <button type="button" class="btn alt sm" id="fClear">Clear</button>
  </div>

    <table id="itemsTable" data-low="<?= (int) $lowLimit ?>">
      <thead>
        <tr>
          <th>Item</th><th>Owner</th><th>Category</th><th>Type</th>
          <th class="n">Price</th><th class="n">Start</th><th class="n">Sold</th><th class="n">Left</th><th class="n">Actions</th>
        </tr>
      </thead>
      <tbody>
      <?php foreach ($items as $it):
          $low = $it['left'] !== null && $it['left'] <= $lowLimit; ?>
        <tr data-left="<?= $it['left'] === null ? '' : (int) $it['left'] ?>">
          <td class="nm"><?= e($it['name']) ?></td>
          <td><?= e($it['owner']) ?></td>
          <td><?= $it['category'] !== null ? '<span class="cpill" style="--cc:' . e($it['color']) . '">' . e($it['category']) . '</span>' : 'Uncategorized' ?></td>
          <td><?= e($it['type'] ?? 'None') ?></td>
          <td class="n m"><?= e(number_format((float) $it['price'], 2)) ?></td>
          <td class="n q"><?= $it['starting_qty'] === null ? '-' : (int) $it['starting_qty'] ?></td>
          <td class="n q"><?= (int) $it['sold'] ?></td>
          <td class="n q<?= $low ? ' low' : '' ?>"><?= $it['left'] === null ? '-' : (int) $it['left'] ?></td>
          <td class="n">
            <button type="button" class="link edit"
                    data-bs-toggle="modal" data-bs-target="#itemModal"
                    data-id="<?= (int) $it['id'] ?>"
                    data-name="<?= e($it['name']) ?>"
                    data-vendor="<?= (int) $it['vendor_id'] ?>"
                    data-category="<?= (int) ($it['category_id'] ?? 0) ?>"
                    data-type="<?= (int) ($it['item_type_id'] ?? 0) ?>"
                    data-price="<?= e(number_format((float) $it['price'], 2, '.', '')) ?>"
                    data-qty="<?= $it['starting_qty'] === null ? '' : (int) $it['starting_qty'] ?>">Edit</button>
            <button type="button" class="link"
                    data-bs-toggle="modal" data-bs-target="#delModal"
                    data-id="<?= (int) $it['id'] ?>"
                    data-name="<?= e($it['name']) ?>">Delete</button>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
</div>

<!-- Add / Edit item -->
<div class="modal fade" id="itemModal" tabindex="-1" aria-labelledby="itemModalTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <form class="modal-content" method="post" action="<?= e($base) ?>/items/save" id="itemForm" novalidate>
      <?= Csrf::field() ?>
      <input type="hidden" name="id" id="i_id" value="0">
      <div class="modal-header">
        <h2 class="modal-title" id="itemModalTitle" style="font-size:17px;margin:0">Add item</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="row" style="flex-direction:column;align-items:stretch;gap:var(--s3)">
          <label>Item name
            <input type="text" name="name" id="i_name" maxlength="120" required>
          </label>
          <label>Owner
            <select class="f" name="vendor_id" id="i_vendor" required>
              <?php foreach ($options['vendors'] as $v): ?><option value="<?= (int) $v['id'] ?>"><?= e($v['name']) ?></option><?php endforeach; ?>
            </select>
          </label>
          <label>Category
            <select class="f" name="category_id" id="i_cat">
              <option value="0">Uncategorized</option>
              <?php foreach ($options['categories'] as $c): ?><option value="<?= (int) $c['id'] ?>"><?= e($c['name']) ?></option><?php endforeach; ?>
            </select>
          </label>
          <label>Type
            <select class="f" name="item_type_id" id="i_type">
              <option value="0">None</option>
              <?php foreach ($options['types'] as $t): ?><option value="<?= (int) $t['id'] ?>"><?= e($t['label']) ?></option><?php endforeach; ?>
            </select>
          </label>
          <label>Price (P)
            <input type="number" name="price" id="i_price" min="0" step="0.01" inputmode="decimal" required>
          </label>
          <label>Starting quantity (blank = not counted)
            <input type="number" name="starting_qty" id="i_qty" min="0" step="1" inputmode="numeric">
          </label>
          <p class="err" id="i_err" role="alert"></p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn alt" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn">Save</button>
      </div>
    </form>
  </div>
</div>

<!-- Delete confirmation -->
<div class="modal fade" id="delModal" tabindex="-1" aria-labelledby="delModalTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <form class="modal-content" method="post" action="<?= e($base) ?>/items/delete">
      <?= Csrf::field() ?>
      <input type="hidden" name="id" id="d_id" value="0">
      <div class="modal-header">
        <h2 class="modal-title" id="delModalTitle" style="font-size:17px;margin:0">Delete item</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Delete <b id="d_name"></b>? This cannot be undone. An item that already has sales cannot be deleted.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn alt" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn red">Delete</button>
      </div>
    </form>
  </div>
</div>

<script src="<?= e($base) ?>/assets/js/items.js" defer></script>