<?php
/** Payout page: what each vendor is owed. No HTML and no SQL here. */
class PayoutController extends BaseController
{
    public function index(): void
    {
        $this->requirePermission('view_payout');

        // The workspace always comes from the session, never from the request.
        $user = Session::user();
        $ws   = (int) ($user['workspace_id'] ?? 0);
        if ($ws < 1) {
            $this->abort(403);
        }

        $days   = (new EventDay())->forWorkspace($ws);
        $dayNos = array_map(fn($d) => (string) $d['day_no'], $days);
        $scope  = (string) ($_GET['scope'] ?? 'all');
        if ($scope !== 'all' && !in_array($scope, $dayNos, true)) {
            $scope = 'all';
        }

        $rows = [];
        try {
            $rows = (new Payout())->byVendor($ws, $scope === 'all' ? null : (int) $scope);
        } catch (RuntimeException $e) {
            Session::flash('error', $e->getMessage());   // shown on this same page
        }

        $this->render('payout', [
            'layout'     => 'app',
            'theme'      => $user['theme'] ?? 'dark',
            'user'       => $user,
            'active'     => 'payout',
            'heading'    => 'Hello, ' . ($user['name'] ?? ''),
            'subheading' => $user['workspace_name'] ?? '',
            'pageTitle'  => 'Payout',
            'days'       => $days,
            'dayAction'  => '/payout',
            'scope'      => $scope,
            'rows'       => $rows,
            'totals'     => Payout::summarize($rows),
        ]);
    }
}