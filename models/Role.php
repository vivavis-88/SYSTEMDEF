<?php
/** Roles and their permissions. Access rules live in the database, not in the code. */
class Role extends Model
{
    /** @return string[] permission codes such as create_sale */
    public function permissionsFor(int $roleId): array
    {
        try {
            $stmt = $this->db->prepare(
                'SELECT p.code
                   FROM role_permissions rp
                   JOIN permissions p ON p.id = rp.permission_id
                  WHERE rp.role_id = :r
                  ORDER BY p.code'
            );
            $stmt->execute(['r' => $roleId]);
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (PDOException $e) {
            $this->fail($e);
        }
    }
}
