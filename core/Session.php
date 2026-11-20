<?php
/**
 * Session wrapper: secure cookie settings, idle timeout, flash messages,
 * and the logged-in user. The workspace always comes from here, never from the request.
 */
class Session
{
    /** Idle limit in seconds per role (blueprint section 13, item 7). */
    private const IDLE = ['cashier' => 1800, 'admin' => 900, 'owner' => 900];

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        ini_set('session.use_strict_mode', '1');
        session_name('booth_sid');
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure'   => !empty($_SERVER['HTTPS']),
        ]);
        session_start();
        self::enforceIdleTimeout();
    }

    private static function enforceIdleTimeout(): void
    {
        if (!self::isLoggedIn()) {
            return;
        }
        $limit = self::IDLE[$_SESSION['user']['role'] ?? ''] ?? 900;
        if (time() - (int) ($_SESSION['last_activity'] ?? time()) > $limit) {
            self::flush();
            self::flash('error', 'You were signed out because of inactivity.');
            return;
        }
        $_SESSION['last_activity'] = time();
    }

    public static function get(string $key, $default = null)
    {
        return $_SESSION[$key] ?? $default;
    }

    public static function set(string $key, $value): void
    {
        $_SESSION[$key] = $value;
    }

    public static function forget(string $key): void
    {
        unset($_SESSION[$key]);
    }

    /** Start an authenticated session. A new session id defeats session fixation. */
    public static function login(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION['user'] = $user;
        $_SESSION['last_activity'] = time();
        unset($_SESSION['pending']);
    }

    public static function isLoggedIn(): bool
    {
        return !empty($_SESSION['user']['id']);
    }

    public static function user(): array
    {
        return $_SESSION['user'] ?? [];
    }

    public static function can(string $permission): bool
    {
        return in_array($permission, $_SESSION['user']['perms'] ?? [], true);
    }

    /** Clear everything (logout, idle timeout) and issue a fresh session id. */
    public static function flush(): void
    {
        $_SESSION = [];
        session_regenerate_id(true);
    }

    public static function flash(string $type, string $message): void
    {
        $_SESSION['flash'][$type] = $message;
    }

    /** Read and clear the flash messages. */
    public static function pullFlash(): array
    {
        $flash = $_SESSION['flash'] ?? [];
        unset($_SESSION['flash']);
        return $flash;
    }
}
