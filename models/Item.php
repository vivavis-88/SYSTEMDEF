<?php
/** Things a workspace sells. Every query is scoped by workspace_id. */
class Item extends Model
{
    /** Items with their owner (vendor), category, units sold and units left. */
    public function forSale(int $workspaceId): array
    {
        $rows = [];
        try {
            $stmt = $this->db->prepare(
                'SELECT i.id, i.name, i.price, i.starting_qty,
                        v.name AS owner,
                        c.id AS category_id, c.name AS category, c.color,
                        COALESCE(s.sold, 0) AS sold
                   FROM items i
                   JOIN vendors v          ON v.id = i.vendor_id
                   LEFT JOIN categories c  ON c.id = i.category_id
                   LEFT JOIN (SELECT item_id, SUM(qty) AS sold
                                FROM sales
                               WHERE workspace_id = :ws_sales
                               GROUP BY item_id) s ON s.item_id = i.id
                  WHERE i.workspace_id = :ws
                  ORDER BY v.name, i.name'
            );
            $stmt->execute(['ws_sales' => $workspaceId, 'ws' => $workspaceId]);
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        foreach ($rows as &$r) {
            $r['sold'] = (int) $r['sold'];
            $r['left'] = $r['starting_qty'] === null ? null : (int) $r['starting_qty'] - $r['sold'];
        }
        unset($r);
        return $rows;
    }

    /** One item, only if it belongs to this workspace. */
    public function findInWorkspace(int $id, int $workspaceId): ?array
    {
        $row = false;
        try {
            $stmt = $this->db->prepare(
                'SELECT i.id, i.name, i.price, v.name AS owner
                   FROM items i
                   JOIN vendors v ON v.id = i.vendor_id
                  WHERE i.id = :id AND i.workspace_id = :ws
                  LIMIT 1'
            );
            $stmt->execute(['id' => $id, 'ws' => $workspaceId]);
            $row = $stmt->fetch();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        return $row ?: null;
    }

    // ---------------------------------------------------------------
    // Items page (manage): list, dropdown options, save, delete
    // ---------------------------------------------------------------

    /** Every item of the workspace with owner, category, type, units sold and units left. */
    public function forManage(int $workspaceId): array
    {
        $rows = [];
        try {
            $stmt = $this->db->prepare(
                'SELECT i.id, i.name, i.price, i.starting_qty,
                        i.vendor_id, i.category_id, i.item_type_id,
                        v.name AS owner,
                        c.name AS category, c.color,
                        t.label AS type,
                        COALESCE(s.sold, 0) AS sold
                   FROM items i
                   JOIN vendors v          ON v.id = i.vendor_id
                   LEFT JOIN categories c  ON c.id = i.category_id
                   LEFT JOIN item_types t  ON t.id = i.item_type_id
                   LEFT JOIN (SELECT item_id, SUM(qty) AS sold
                                FROM sales
                               WHERE workspace_id = :ws_sales
                               GROUP BY item_id) s ON s.item_id = i.id
                  WHERE i.workspace_id = :ws
                  ORDER BY v.name, i.name'
            );
            $stmt->execute(['ws_sales' => $workspaceId, 'ws' => $workspaceId]);
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        foreach ($rows as &$r) {
            $r['sold'] = (int) $r['sold'];
            $r['left'] = $r['starting_qty'] === null ? null : (int) $r['starting_qty'] - $r['sold'];
        }
        unset($r);
        return $rows;
    }

    /** Dropdown choices for the filter bar and the Add / Edit form. */
    public function options(int $workspaceId): array
    {
        $out = ['vendors' => [], 'categories' => [], 'types' => []];
        try {
            $q = $this->db->prepare('SELECT id, name FROM vendors WHERE workspace_id = :ws ORDER BY is_house DESC, name');
            $q->execute(['ws' => $workspaceId]);
            $out['vendors'] = $q->fetchAll();

            $q = $this->db->prepare('SELECT id, name, color FROM categories WHERE workspace_id = :ws ORDER BY name');
            $q->execute(['ws' => $workspaceId]);
            $out['categories'] = $q->fetchAll();

            $out['types'] = $this->db->query('SELECT id, label FROM item_types ORDER BY id')->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        return $out;
    }

    /**
     * Create (id = 0) or update an item. Repeats every browser rule, then the database repeats the rest.
     * Returns ['ok' => bool, 'errors' => string[], 'created' => bool].
     */
    public function save(int $workspaceId, int $id, array $in): array
    {
        $name    = trim((string) ($in['name'] ?? ''));
        $priceIn = trim((string) ($in['price'] ?? ''));
        $qtyIn   = trim((string) ($in['starting_qty'] ?? ''));
        $vendor  = (int) ($in['vendor_id'] ?? 0);
        $cat     = (int) ($in['category_id'] ?? 0);
        $type    = (int) ($in['item_type_id'] ?? 0);

        $errors = [];
        $len = mb_strlen($name);
        if ($len < 1 || $len > 120) {
            $errors[] = 'Item name must be 1 to 120 characters.';
        }
        if ($priceIn === '' || !is_numeric($priceIn) || (float) $priceIn < 0 || (float) $priceIn > 99999999.99) {
            $errors[] = 'Enter a price of 0 or more.';
        }
        if ($qtyIn !== '' && (!ctype_digit($qtyIn) || strlen($qtyIn) > 9)) {
            $errors[] = 'Starting quantity must be a whole number, or left blank.';
        }
        if ($errors) {
            return ['ok' => false, 'errors' => $errors, 'created' => false];
        }

        $price = number_format((float) $priceIn, 2, '.', '');
        $qty   = $qtyIn === '' ? null : (int) $qtyIn;

        try {
            // Vendor, category and type must belong to this workspace.
            if (!$this->exists('SELECT 1 FROM vendors WHERE id = :id AND workspace_id = :ws', $vendor, $workspaceId)) {
                return ['ok' => false, 'errors' => ['Choose a valid owner.'], 'created' => false];
            }
            if ($cat > 0 && !$this->exists('SELECT 1 FROM categories WHERE id = :id AND workspace_id = :ws', $cat, $workspaceId)) {
                return ['ok' => false, 'errors' => ['Choose a valid category.'], 'created' => false];
            }
            if ($type > 0 && !$this->exists('SELECT 1 FROM item_types WHERE id = :id', $type)) {
                return ['ok' => false, 'errors' => ['Choose a valid type.'], 'created' => false];
            }

            if ($id > 0) {
                $sold = $this->soldFor($id, $workspaceId);
                if ($qty !== null && $qty < $sold) {
                    return ['ok' => false, 'errors' => ["Starting quantity cannot be less than the $sold already sold."], 'created' => false];
                }
                $stmt = $this->db->prepare(
                    'UPDATE items
                        SET vendor_id = :vendor, category_id = :cat, item_type_id = :type,
                            name = :name, price = :price, starting_qty = :qty
                      WHERE id = :id AND workspace_id = :ws'
                );
                $stmt->execute([
                    'vendor' => $vendor, 'cat' => $cat > 0 ? $cat : null, 'type' => $type > 0 ? $type : null,
                    'name' => $name, 'price' => $price, 'qty' => $qty, 'id' => $id, 'ws' => $workspaceId,
                ]);
                if ($stmt->rowCount() === 0) {
                    return ['ok' => false, 'errors' => ['That item no longer exists.'], 'created' => false];
                }
                return ['ok' => true, 'errors' => [], 'created' => false];
            }

            $stmt = $this->db->prepare(
                'INSERT INTO items (workspace_id, vendor_id, category_id, item_type_id, name, price, starting_qty)
                 VALUES (:ws, :vendor, :cat, :type, :name, :price, :qty)'
            );
            $stmt->execute([
                'ws' => $workspaceId, 'vendor' => $vendor,
                'cat' => $cat > 0 ? $cat : null, 'type' => $type > 0 ? $type : null,
                'name' => $name, 'price' => $price, 'qty' => $qty,
            ]);
            return ['ok' => true, 'errors' => [], 'created' => true];
        } catch (PDOException $e) {
            if ((string) ($e->errorInfo[0] ?? '') === '23505') {      // UNIQUE (workspace, vendor, name, price)
                self::logError($e);
                return ['ok' => false, 'errors' => ['That item already exists for this owner at this price.'], 'created' => false];
            }
            $this->fail($e);
        }
    }

    /** Delete an item. Blocked by the database when the item already has sales. */
    public function delete(int $id, int $workspaceId): array
    {
        try {
            $stmt = $this->db->prepare('DELETE FROM items WHERE id = :id AND workspace_id = :ws');
            $stmt->execute(['id' => $id, 'ws' => $workspaceId]);
            if ($stmt->rowCount() === 0) {
                return ['ok' => false, 'error' => 'That item no longer exists.'];
            }
            return ['ok' => true, 'error' => ''];
        } catch (PDOException $e) {
            if ((string) ($e->errorInfo[0] ?? '') === '23503') {      // foreign key: sales still point to it
                self::logError($e);
                return ['ok' => false, 'error' => 'This item already has sales. Delete those sales first.'];
            }
            $this->fail($e);
        }
    }

    // ---------------------------------------------------------------
    // small helpers (private)
    // ---------------------------------------------------------------

    private function exists(string $sql, int $id, ?int $workspaceId = null): bool
    {
        $params = ['id' => $id];
        if ($workspaceId !== null) {
            $params['ws'] = $workspaceId;
        }
        $stmt = $this->db->prepare($sql . ' LIMIT 1');
        $stmt->execute($params);
        return (bool) $stmt->fetchColumn();
    }

    private function soldFor(int $itemId, int $workspaceId): int
    {
        $stmt = $this->db->prepare('SELECT COALESCE(SUM(qty), 0) FROM sales WHERE item_id = :id AND workspace_id = :ws');
        $stmt->execute(['id' => $itemId, 'ws' => $workspaceId]);
        return (int) $stmt->fetchColumn();
    }
}