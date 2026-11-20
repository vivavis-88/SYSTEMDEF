<?php
/** Placeholder landing page after login. The real screens replace it in Phase 2. */
class DashboardController extends BaseController
{
    public function index(): void
    {
        $this->requireLogin();
        $user = Session::user();
        $this->render('dashboard', [
            'layout'     => 'app',
            'theme'      => $user['theme'],
            'user'       => $user,
            'active'     => Session::can('view_overview') ? 'home' : '',
            'heading'    => 'Hello, ' . $user['name'],
            'subheading' => $user['workspace_name'],
            'pageTitle'  => $user['workspace_name'] . ' - Dashboard',
        ]);
    }
}
