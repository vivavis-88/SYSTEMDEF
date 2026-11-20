<?php
class Router {
    private array $routes = [];

    public function add(string $method, string $pattern, string $controller, string $action): void {
        $this->routes[] = compact('method', 'pattern', 'controller', 'action');
    }

    public function dispatch(string $method, string $uri): void {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';

        // Remove the project folder (e.g. /BOOTH) from the start of the path.
        $base = rtrim(parse_url(BASE_URL, PHP_URL_PATH) ?? '', '/');
        if ($base !== '' && stripos($path, $base) === 0) {
            $path = substr($path, strlen($base));
        }
        $path = '/' . trim($path, '/');

        foreach ($this->routes as $r) {
            $regex = '#^' . preg_replace('#\{\w+\}#', '([^/]+)', $r['pattern']) . '$#';
            if ($r['method'] === $method && preg_match($regex, $path, $m)) {
                array_shift($m);
                $controller = new $r['controller']();
                $controller->{$r['action']}(...$m);
                return;
            }
        }

        http_response_code(404);
        echo '404 - Page not found';
        if (APP_ENV === 'local') echo "<br><small>Looked for route: [$path]</small>";
    }
}