<?php
/** The selling days of a workspace (Day 1, Day 2 ...). */
class EventDay extends Model
{
    public function forWorkspace(int $workspaceId): array
    {
        $rows = [];
        try {
            $stmt = $this->db->prepare(
                'SELECT id, day_no, event_date
                   FROM event_days
                  WHERE workspace_id = :ws
                  ORDER BY day_no'
            );
            $stmt->execute(['ws' => $workspaceId]);
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        foreach ($rows as &$r) {
            $r['label'] = self::label($r);
        }
        unset($r);
        return $rows;
    }

    /** "Day 1 - Nov 10, 2026" */
    public static function label(array $day): string
    {
        $text = 'Day ' . (int) $day['day_no'];
        if (!empty($day['event_date'])) {
            $text .= ' - ' . date('M j, Y', strtotime($day['event_date']));
        }
        return $text;
    }
}