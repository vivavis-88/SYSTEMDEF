<?php
/**
 * A sale = one row in `sales` (one item, one quantity, one price).
 * The total is never stored: it is qty * unit_price, calculated when read.
 * unit_price is a snapshot of the price actually charged.
 * Written to match SaleController. Every query is scoped by workspace_id.
 */
class Sale extends Model
{
    /**
     * Record a sale from the Sell form.
     * Expected fields: item_id, qty, price (optional), day_no (optional, else the remembered day).
     * @return array{ok:bool, errors:string[], item?:array, qty?:int, item_id?:int, id?:int}
     */
    public function add(int $workspaceId, int $cashierId, array $in): array
    {
        $itemId   = (int) ($in['item_id'] ?? 0);
        $qty      = (int) ($in['qty'] ?? 0);
        $dayNo    = (int) ($in['day_no'] ?? Session::get('day_no', 0));
        $priceRaw = trim((string) ($in['price'] ?? ''));

        $errors = [];
        if ($itemId < 1) {
            $errors[] = 'Choose an item.';
        }
        if ($qty < 1 || $qty > 9999) {
            $errors[] = 'Quantity must be a whole number from 1 to 9999.';
        }
        if ($priceRaw !== '' && (!is_numeric($priceRaw) || (float) $priceRaw < 0 || (float) $priceRaw > 99999999.99)) {
            $errors[] = 'Enter a valid price.';
        }
        if ($dayNo < 1) {
            $errors[] = 'Choose a selling day.';
        }
        if ($errors) {
            return ['ok' => false, 'errors' => $errors];
        }

        try {
            $this->db->beginTransaction();

            // Lock the item row so two cashiers cannot both sell the last unit.
            $stmt = $this->db->prepare(
                'SELECT i.id, i.name, i.price, i.starting_qty, v.name AS owner
                   FROM items i
                   JOIN vendors v ON v.id = i.vendor_id
                  WHERE i.id = :id AND i.workspace_id = :ws
                  FOR UPDATE OF i'
            );
            $stmt->execute(['id' => $itemId, 'ws' => $workspaceId]);
            $item = $stmt->fetch();
            if (!$item) {
                return $this->stop(['That item is not available.']);
            }

            $stmt = $this->db->prepare('SELECT id FROM event_days WHERE workspace_id = :ws AND day_no = :d');
            $stmt->execute(['ws' => $workspaceId, 'd' => $dayNo]);
            $dayId = (int) $stmt->fetchColumn();
            if ($dayId < 1) {
                return $this->stop(['That day is not valid.']);
            }

            if ($item['starting_qty'] !== null) {
                $stmt = $this->db->prepare(
                    'SELECT COALESCE(SUM(qty), 0) FROM sales WHERE item_id = :id AND workspace_id = :ws'
                );
                $stmt->execute(['id' => $itemId, 'ws' => $workspaceId]);
                $left = (int) $item['starting_qty'] - (int) $stmt->fetchColumn();
                if ($qty > $left) {
                    return $this->stop([
                        $left <= 0 ? $item['name'] . ' is sold out.'
                                   : 'Only ' . $left . ' left of ' . $item['name'] . '.',
                    ]);
                }
            }

            $price = $priceRaw === '' ? $item['price'] : number_format((float) $priceRaw, 2, '.', '');

            $stmt = $this->db->prepare(
                'INSERT INTO sales (workspace_id, item_id, event_day_id, cashier_user_id, qty, unit_price)
                 VALUES (:ws, :item, :day, :cashier, :qty, :price)
                 RETURNING id'
            );
            $stmt->execute([
                'ws' => $workspaceId, 'item' => $itemId, 'day' => $dayId,
                'cashier' => $cashierId, 'qty' => $qty, 'price' => $price,
            ]);
            $id = (int) $stmt->fetchColumn();

            $this->db->commit();
            return ['ok' => true, 'errors' => [], 'id' => $id, 'item' => $item, 'qty' => $qty, 'item_id' => $itemId];
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            $this->fail($e);
        }
    }

    /** Roll back and report validation errors. */
    private function stop(array $errors): array
    {
        if ($this->db->inTransaction()) {
            $this->db->rollBack();
        }
        return ['ok' => false, 'errors' => $errors];
    }

    /**
     * Sales for one day number, or every day when $dayNo is null. Newest first.
     * Each row has: id, item_id, item_name, owner, category, color, qty, unit_price,
     * total, sold_at, day_no, cashier, cashier_user_id.
     */
    public function forScope(int $workspaceId, ?int $dayNo): array
    {
        try {
            $sql = 'SELECT s.id, s.item_id, i.name AS item_name, v.name AS owner,
                           c.name AS category, c.color,
                           s.qty, s.unit_price, (s.qty * s.unit_price) AS total, s.sold_at,
                           d.day_no, u.display_name AS cashier, s.cashier_user_id
                      FROM sales s
                      JOIN items i          ON i.id = s.item_id
                      JOIN vendors v        ON v.id = i.vendor_id
                      LEFT JOIN categories c ON c.id = i.category_id
                      JOIN event_days d     ON d.id = s.event_day_id
                      JOIN users u          ON u.id = s.cashier_user_id
                     WHERE s.workspace_id = :ws';
            $params = ['ws' => $workspaceId];
            if ($dayNo !== null) {
                $sql .= ' AND d.day_no = :day';
                $params['day'] = $dayNo;
            }
            $sql .= ' ORDER BY s.sold_at DESC, s.id DESC';
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }
    }

    /** One sale, only if it belongs to this workspace. */
    public function findInWorkspace(int $id, int $workspaceId): ?array
    {
        $row = false;
        try {
            $stmt = $this->db->prepare(
                'SELECT s.id, s.item_id, s.qty, s.unit_price, s.cashier_user_id, s.event_day_id
                   FROM sales s
                  WHERE s.id = :id AND s.workspace_id = :ws'
            );
            $stmt->execute(['id' => $id, 'ws' => $workspaceId]);
            $row = $stmt->fetch();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        return $row ?: null;
    }

    public function delete(int $id, int $workspaceId): bool
    {
        try {
            $stmt = $this->db->prepare('DELETE FROM sales WHERE id = :id AND workspace_id = :ws');
            $stmt->execute(['id' => $id, 'ws' => $workspaceId]);
            return $stmt->rowCount() === 1;
        } catch (PDOException $e) {
            $this->fail($e);
        }
    }

    /** Totals for a list of rows from forScope(): count, units and total money. */
    public static function summarize(array $rows): array
    {
        $units = 0;
        $cents = 0;
        foreach ($rows as $r) {
            $units += (int) $r['qty'];
            $cents += (int) round((float) $r['unit_price'] * 100) * (int) $r['qty'];
        }
        return ['count' => count($rows), 'units' => $units, 'total' => $cents / 100];
    }
}