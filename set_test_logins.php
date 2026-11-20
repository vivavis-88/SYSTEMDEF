<?php
/**
 * LOCAL ONLY. Gives every user a known test password and PIN, then lists who can log in.
 *   CLI:  php set_test_logins.php          (run it from the project folder)
 * Delete this file before submitting.
 */
require __DIR__ . '/config/app.php';
if (APP_ENV !== 'local') { exit('Only available when APP_ENV is "local".'); }

spl_autoload_register(function (string $class) {
    foreach (['core', 'models', 'controllers'] as $dir) {
        $file = BASE_PATH . "/$dir/$class.php";
        if (is_file($file)) { require $file; return; }
    }
});
if (PHP_SAPI !== 'cli') { header('Content-Type: text/plain; charset=utf-8'); }

$db = Model::connection();

const TEST_PASSWORD = 'Booth#Demo2026pw';
const TEST_PIN      = '482916';

$db->prepare(
    'UPDATE users
        SET password_hash     = CASE WHEN email IS NULL THEN NULL ELSE :pw END,
            pin_hash          = :pin,
            email_verified_at = CASE WHEN email IS NULL THEN email_verified_at ELSE COALESCE(email_verified_at, NOW()) END,
            failed_attempts   = 0,
            locked_until      = NULL'
)->execute(['pw' => password_hash(TEST_PASSWORD, PASSWORD_DEFAULT), 'pin' => password_hash(TEST_PIN, PASSWORD_DEFAULT)]);

echo "Done. Everyone now has the same test PIN, and users with an email share the same password.\n\n";
echo "Password : " . TEST_PASSWORD . "\n";
echo "PIN      : " . TEST_PIN . "\n\n";

$rows = $db->query(
    "SELECT w.slug, u.display_name, COALESCE(u.email, '(no email - PIN only)') AS email, r.code AS role
       FROM workspace_members m
       JOIN workspaces w ON w.id = m.workspace_id
       JOIN users u      ON u.id = m.user_id
       JOIN roles r      ON r.id = m.role_id
      WHERE m.status = 'active'
      ORDER BY w.slug, r.id, u.display_name"
)->fetchAll();
foreach ($rows as $r) {
    printf("%-14s %-9s %-22s %s\n", $r['slug'], $r['role'], $r['display_name'], $r['email']);
}