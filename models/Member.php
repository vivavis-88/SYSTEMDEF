<?php
/** Membership: which user belongs to which workspace, with which role. */
class Member extends Model
{
    /** Active cashiers shown as "Log in as" cards. */
    public function cashiers(int $workspaceId): array
    {
        try {
            $stmt = $this->db->prepare(
                "SELECT u.id, u.display_name
                   FROM workspace_members m
                   JOIN users u ON u.id = m.user_id
                   JOIN roles r ON r.id = m.role_id
                  WHERE m.workspace_id = :ws AND m.status = 'active' AND r.code = 'cashier'
                  ORDER BY u.display_name"
            );
            $stmt->execute(['ws' => $workspaceId]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }
    }

    /** The user's active role in this workspace, or null if they do not belong. */
    public function findActive(int $workspaceId, int $userId): ?array
    {
        try {
            $stmt = $this->db->prepare(
                "SELECT r.id AS role_id, r.code AS role
                   FROM workspace_members m
                   JOIN roles r ON r.id = m.role_id
                  WHERE m.workspace_id = :ws AND m.user_id = :u AND m.status = 'active'
                  LIMIT 1"
            );
            $stmt->execute(['ws' => $workspaceId, 'u' => $userId]);
            $row = $stmt->fetch();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        return $row ?: null;
    }

    /** Used when the member list is hidden and staff type their name. Returns an id only if exactly one match. */
    public function findCashierIdByName(int $workspaceId, string $name): ?int
    {
        try {
            $stmt = $this->db->prepare(
                "SELECT u.id
                   FROM workspace_members m
                   JOIN users u ON u.id = m.user_id
                   JOIN roles r ON r.id = m.role_id
                  WHERE m.workspace_id = :ws AND m.status = 'active' AND r.code = 'cashier'
                    AND LOWER(u.display_name) = LOWER(:name)"
            );
            $stmt->execute(['ws' => $workspaceId, 'name' => trim($name)]);
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        return count($rows) === 1 ? (int) $rows[0]['id'] : null;
    }
}
