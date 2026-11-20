<?php
/** The public workspace page: "Log in as" cards. No HTML here, no SQL here. */
class WorkspaceController extends BaseController
{
    public function show(string $slug): void
    {
        $ws = (new Workspace())->findBySlug($slug);
        if (!$ws) {
            $this->abort(404);
        }
        if (Session::isLoggedIn() && (int) (Session::user()['workspace_id'] ?? 0) === (int) $ws['id']) {
            $this->redirect('/dashboard');
        }
        $cashiers = (int) $ws['show_member_list'] ? (new Member())->cashiers((int) $ws['id']) : [];
        $this->render('workspace', [
            'workspace' => $ws,
            'cashiers'  => $cashiers,
            'theme'     => $ws['theme'],
        ]);
    }
}
