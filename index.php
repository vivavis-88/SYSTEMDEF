<?php
require __DIR__ . '/config/app.php';
require BASE_PATH . '/core/helpers.php';

spl_autoload_register(function (string $class) {
    foreach (['core', 'models', 'controllers'] as $dir) {
        $file = BASE_PATH . "/$dir/$class.php";
        if (is_file($file)) { require $file; return; }
    }
});

Session::start();

$router = new Router();

// Public
$router->add('GET',  '/',      'AuthController', 'showLogin');
$router->add('GET',  '/login', 'AuthController', 'showLogin');

// Workspace login
$router->add('GET',  '/w/{slug}',         'WorkspaceController', 'show');
$router->add('GET',  '/w/{slug}/staff',   'AuthController',      'showStaffLogin');
$router->add('POST', '/w/{slug}/staff',   'AuthController',      'staffLogin');
$router->add('GET',  '/w/{slug}/as/{id}', 'AuthController',      'pickCashier');
$router->add('POST', '/w/{slug}/by-name', 'AuthController',      'byName');
$router->add('GET',  '/w/{slug}/pin',     'AuthController',      'showPin');
$router->add('POST', '/w/{slug}/pin',     'AuthController',      'verifyPin');

// Signed in
$router->add('GET',  '/dashboard', 'DashboardController', 'index');
$router->add('POST', '/logout',    'AuthController',      'logout');

// Sell and Sales log
$router->add('GET',  '/sell',         'SaleController', 'sell');
$router->add('POST', '/sell',         'SaleController', 'store');
$router->add('GET',  '/sales',        'SaleController', 'index');
$router->add('POST', '/sales/delete', 'SaleController', 'delete');
$router->add('GET',  '/items',        'ItemController', 'index');
$router->add('POST', '/items/save',   'ItemController', 'save');
$router->add('POST', '/items/delete', 'ItemController', 'delete');

// Payout
$router->add('GET',  '/payout', 'PayoutController', 'index');
// dispatch() always goes LAST, after every route is added.
try {
    $router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
} catch (Throwable $e) {
    Model::logError($e);
    http_response_code(500);
    echo APP_ENV === 'local'
        ? '<pre>' . e($e->getMessage()) . "\n" . e(basename($e->getFile()) . ':' . $e->getLine()) . '</pre>'
        : 'Something went wrong. Please try again.';
}