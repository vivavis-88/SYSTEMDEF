<?php
/** A log system (Personal or Business). Looked up by its public slug. */
class Workspace extends Model
{
    public function findBySlug(string $slug): ?array
    {
        if (!preg_match('/^[a-z0-9-]{1,40}$/', $slug)) {
            return null;
        }
        try {
            $stmt = $this->db->prepare(
                'SELECT w.id, w.name, w.slug, w.show_member_list,
                        t.code AS theme, a.code AS account_type
                   FROM workspaces w
                   JOIN themes t        ON t.id = w.theme_id
                   JOIN account_types a ON a.id = w.account_type_id
                  WHERE w.slug = :slug
                  LIMIT 1'
            );
            $stmt->execute(['slug' => $slug]);
            $row = $stmt->fetch();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        return $row ?: null;
    }
}
