<?php
/**
 * The sidebar menu, in one place. A person only sees the items their role has permission for.
 * Flip 'ready' to true when a screen is built; until then it shows greyed out.
 */
class Nav
{
    //             key        label        icon     path         permission        ready
    private const ITEMS = [
        ['home',     'Overview',  'home',  '/dashboard', 'view_overview',   true],
        ['sell',     'Sell',      'sell',  '/sell',      'create_sale',     true],
        ['items',    'Items',     'items', '/items',     'manage_items',    true],
        ['sales',    'Sales log', 'log',   '/sales',     'view_sales',      true],
        ['sheet',    'Sheet',     'sheet', '/sheet',     'view_sales',      false],
        ['payout',   'Payout',    'pay',   '/payout',    'view_payout',     true],
        ['export',   'Export',    'exp',   '/export',    'export_data',     false],
        ['settings', 'Settings',  'set',   '/settings',  'manage_settings', false],
    ];

    public static function forUser(): array
    {
        $out = [];
        foreach (self::ITEMS as [$key, $label, $icon, $path, $permission, $ready]) {
            if (Session::can($permission)) {
                $out[] = compact('key', 'label', 'icon', 'path', 'ready');
            }
        }
        return $out;
    }
}