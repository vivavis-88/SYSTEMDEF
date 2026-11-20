<?php
/**
 * Parent of every controller: rendering, redirects, CSRF and permission checks.
 * Controllers never print HTML themselves; they pick a view in /views.
 */
abstract class BaseController
{
    protected function url(string $path = ''): string
    {
        return rtrim(BASE_URL, '/') . '/' . ltrim($path, '/');
    }

    /**
     * layout 'auth' = centered card (login pages).
     * layout 'app'  = sidebar + header shell (signed-in pages).
     */
    protected function render(string $view, array $data = []): void
    {
        $data += [
            'theme'   => 'dark',
            'base'    => rtrim(BASE_URL, '/'),
            'appName' => defined('APP_NAME') ? APP_NAME : 'Booth',
            'flash'   => Session::pullFlash(),
            'layout'  => 'auth',
        ];
        if ($data['layout'] === 'app') {
            $data += [
                'user'       => Session::user(),
                'nav'        => Nav::forUser(),
                'active'     => '',
                'heading'    => '',
                'subheading' => '',
            ];
        }
        extract($data, EXTR_SKIP);
        require BASE_PATH . '/views/layout/header_view.php';
        if ($layout === 'app') {
            require BASE_PATH . '/views/layout/app_top_view.php';
        }
        require BASE_PATH . '/views/' . $view . '_view.php';
        if ($layout === 'app') {
            require BASE_PATH . '/views/layout/app_bottom_view.php';
        }
        require BASE_PATH . '/views/layout/footer_view.php';
    }

    protected function redirect(string $path): never
    {
        header('Location: ' . $this->url($path));
        exit;
    }

    /** Flash an error and go back to a page (post, redirect, get). */
    protected function back(string $path, string $message): never
    {
        Session::flash('error', $message);
        $this->redirect($path);
    }

    protected function requireCsrf(string $backPath): void
    {
        if (!Csrf::check($_POST['_csrf'] ?? null)) {
            $this->back($backPath, 'Your page expired. Please try again.');
        }
    }

    protected function requireLogin(): void
    {
        if (!Session::isLoggedIn()) {
            $this->redirect('/login');
        }
    }

    protected function requirePermission(string $permission): void
    {
        $this->requireLogin();
        if (!Session::can($permission)) {
            $this->abort(403);
        }
    }

    protected function abort(int $code): never
    {
        http_response_code($code);
        $titles = [403 => '403 - You are not allowed to open this page', 404 => '404 - Page not found'];
        echo $titles[$code] ?? ('Error ' . $code);
        exit;
    }
}
