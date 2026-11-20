<?php
/** Sell screen and Sales log. No HTML and no SQL here: permissions in, models called, view chosen. */
class SaleController extends BaseController
{
    /** The workspace always comes from the session, never from the request. */
    private function workspaceId(): int
    {
        // If your AuthController stores it under another key, change only this line.
        $id = (int) (Session::user()['workspace_id'] ?? 0);
        if ($id < 1) {
            $this->abort(403);
        }
        return $id;
    }

    /** Pick the selling day: ?day=N, else the remembered one, else today's, else Day 1. */
    private function currentDay(array $days): ?array
    {
        if (!$days) {
            return null;
        }
        $want = (int) ($_GET['day'] ?? Session::get('day_no', 0));
        $picked = null;
        foreach ($days as $d) {
            if ((int) $d['day_no'] === $want) {
                $picked = $d;
            }
        }
        if ($picked === null) {
            foreach ($days as $d) {
                if ($d['event_date'] === date('Y-m-d')) {
                    $picked = $d;
                }
            }
        }
        $picked = $picked ?? $days[0];
        Session::set('day_no', (int) $picked['day_no']);
        return $picked;
    }

    private function withDeleteFlag(array $rows): array
    {
        $me = (int) (Session::user()['id'] ?? 0);
        foreach ($rows as &$r) {
            $r['can_delete'] = Session::can('delete_any_sale')
                || (Session::can('delete_own_sale') && (int) $r['cashier_user_id'] === $me);
        }
        unset($r);
        return $rows;
    }

    private function shell(string $active, string $dayAction, array $days, ?array $day): array
    {
        $user = Session::user();
        return [
            'layout'     => 'app',
            'theme'      => $user['theme'] ?? 'dark',
            'user'       => $user,
            'active'     => $active,
            'heading'    => 'Hello, ' . ($user['name'] ?? ''),
            'subheading' => $day['label'] ?? ($user['workspace_name'] ?? ''),
            'days'       => $days,
            'day'        => $day,
            'dayAction'  => $dayAction,
        ];
    }

    // ---------------- Sell ----------------

    public function sell(): void
    {
        $this->requirePermission('create_sale');
        $ws   = $this->workspaceId();
        $days = (new EventDay())->forWorkspace($ws);
        $day  = $this->currentDay($days);

        $items = (new Item())->forSale($ws);
        $categories = [];
        $uncategorized = 0;
        foreach ($items as $it) {
            if ($it['category_id'] === null) {
                $uncategorized++;
                continue;
            }
            $cid = (int) $it['category_id'];
            $categories[$cid] ??= ['id' => $cid, 'name' => $it['category'], 'color' => $it['color'], 'count' => 0];
            $categories[$cid]['count']++;
        }
        usort($categories, fn($a, $b) => strcasecmp($a['name'], $b['name']));

        $todays = $day ? $this->withDeleteFlag((new Sale())->forScope($ws, (int) $day['day_no'])) : [];

        $this->render('sell', $this->shell('sell', '/sell', $days, $day) + [
            'pageTitle'     => 'Sell',
            'items'         => $items,
            'categories'    => $categories,
            'uncategorized' => $uncategorized,
            'recent'        => array_slice($todays, 0, 8),
            'dayTotals'     => Sale::summarize($todays),
            'preselect'     => (int) ($_GET['item'] ?? 0),
        ]);
    }

    public function store(): void
    {
        $this->requirePermission('create_sale');
        $this->requireCsrf('/sell');

        $result = (new Sale())->add($this->workspaceId(), (int) Session::user()['id'], $_POST);
        if (!$result['ok']) {
            $this->back('/sell', implode(' ', $result['errors']));
        }
        Session::flash('success', 'Added: ' . $result['item']['name'] . ' x' . $result['qty']);
        $this->redirect('/sell?item=' . $result['item_id']);
    }

    // ---------------- Sales log ----------------

    public function index(): void
    {
        $this->requirePermission('view_sales');
        $ws   = $this->workspaceId();
        $days = (new EventDay())->forWorkspace($ws);
        $day  = $this->currentDay($days);

        // Scope: a day number or "all". Defaults to the selected day.
        $scope = (string) ($_GET['scope'] ?? ($day['day_no'] ?? 'all'));
        $dayNos = array_map(fn($d) => (string) $d['day_no'], $days);
        if ($scope !== 'all' && !in_array($scope, $dayNos, true)) {
            $scope = $day ? (string) $day['day_no'] : 'all';
        }

        $rows = $this->withDeleteFlag((new Sale())->forScope($ws, $scope === 'all' ? null : (int) $scope));

        $this->render('sales', $this->shell('sales', '/sales', $days, $day) + [
            'pageTitle' => 'Sales log',
            'scope'     => $scope,
            'rows'      => $rows,
            'totals'    => Sale::summarize($rows),
        ]);
    }

    public function delete(): void
    {
        $this->requireLogin();
        $this->requireCsrf('/sales');

        $return = in_array($_POST['return'] ?? '', ['/sales', '/sell'], true) ? $_POST['return'] : '/sales';
        $ws     = $this->workspaceId();
        $sales  = new Sale();
        $sale   = $sales->findInWorkspace((int) ($_POST['sale_id'] ?? 0), $ws);
        if (!$sale) {
            $this->back($return, 'That sale no longer exists.');
        }

        $mine = (int) $sale['cashier_user_id'] === (int) Session::user()['id'];
        if (!(Session::can('delete_any_sale') || (Session::can('delete_own_sale') && $mine))) {
            $this->abort(403);
        }

        $sales->delete((int) $sale['id'], $ws);
        Session::flash('success', 'Sale deleted');
        $this->redirect($return);
    }
}