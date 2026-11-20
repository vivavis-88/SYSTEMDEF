<?php
/**
 * Payout per vendor (Blueprint section 7.4), PostgreSQL version.
 * vendor_gets = sales x (1 - commission / 100). The House vendor keeps 100%, so it gets 0.
 * All SQL lives here; the controller only asks for the numbers.
 */
class Payout extends Model
{
    /** One row per vendor of the workspace, optionally limited to one selling day. */
    public function byVendor(int $workspaceId, ?int $dayNo = null): array
    {
        // Each named parameter is used once (safe with real prepared statements).
        $dayJoin = $dayNo === null ? '' :
            ' AND s.event_day_id = (SELECT d.id FROM event_days d WHERE d.workspace_id = v.workspace_id AND d.day_no = :day)';

        $sql = "SELECT v.id, v.name, v.is_house, w.commission_rate AS rate,
                       COALESCE(SUM(s.qty), 0)                    AS units,
                       COALESCE(SUM(s.qty * s.unit_price), 0)     AS sales,
                       CASE WHEN v.is_house THEN 0
                            ELSE ROUND(COALESCE(SUM(s.qty * s.unit_price), 0) * (1 - w.commission_rate / 100), 2)
                       END AS vendor_gets
                  FROM vendors v
                  JOIN workspaces w ON w.id = v.workspace_id
                  LEFT JOIN items i ON i.vendor_id = v.id
                  LEFT JOIN sales s ON s.item_id = i.id{$dayJoin}
                 WHERE v.workspace_id = :ws
                 GROUP BY v.id, v.name, v.is_house, w.commission_rate
                 ORDER BY v.is_house DESC, v.name";

        $params = ['ws' => $workspaceId];
        if ($dayNo !== null) {
            $params['day'] = $dayNo;
        }

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }

        foreach ($rows as &$r) {
            $r['is_house']    = in_array($r['is_house'], [true, 't', '1', 1], true);
            $r['units']       = (int) $r['units'];
            $r['sales']       = round((float) $r['sales'], 2);
            $r['vendor_gets'] = round((float) $r['vendor_gets'], 2);
            $r['booth_keeps'] = round($r['sales'] - $r['vendor_gets'], 2);
            $r['rate']        = (float) $r['rate'];
        }
        unset($r);
        return $rows;
    }

    /** Totals for the summary cards and the table footer. */
    public static function summarize(array $rows): array
    {
        $t = ['units' => 0, 'sales' => 0.0, 'vendor_gets' => 0.0, 'booth_keeps' => 0.0];
        foreach ($rows as $r) {
            $t['units']       += $r['units'];
            $t['sales']       += $r['sales'];
            $t['vendor_gets'] += $r['vendor_gets'];
            $t['booth_keeps'] += $r['booth_keeps'];
        }
        foreach (['sales', 'vendor_gets', 'booth_keeps'] as $k) {
            $t[$k] = round($t[$k], 2);
        }
        return $t;
    }
}