<?php
/** Items page: list, add, edit, delete. No HTML and no SQL here. */
class ItemController extends BaseController
{
    private const LOW = 3;

    /** The workspace always comes from the session, never from the request. */
    private function workspaceId(): int
    {
        $id = (int) (Session::user()['workspace_id'] ?? 0);
        if ($id < 1) {
            $this->abort(403);
        }
        return $id;
    }

    public function index(): void
    {
        $this->requirePermission('manage_items');
        $ws    = $this->workspaceId();
        $model = new Item();
        $items = $model->forManage($ws);

        $low = 0;
        foreach ($items as $it) {
            if ($it['left'] !== null && $it['left'] <= self::LOW) {
                $low++;
            }
        }

        $user = Session::user();
        $this->render('items', [
            'layout'     => 'app',
            'theme'      => $user['theme'] ?? 'dark',
            'user'       => $user,
            'active'     => 'items',
            'heading'    => 'Items',
            'subheading' => $user['workspace_name'] ?? '',
            'pageTitle'  => 'Items',
            'items'      => $items,
            'options'    => $model->options($ws),
            'itemCount'  => count($items),
            'lowCount'   => $low,
            'lowLimit'   => self::LOW,
        ]);
    }

    public function save(): void
    {
        $this->requirePermission('manage_items');
        $this->requireCsrf('/items');

        try {
            $result = (new Item())->save($this->workspaceId(), (int) ($_POST['id'] ?? 0), $_POST);
        } catch (RuntimeException $e) {
            $this->back('/items', $e->getMessage());
        }
        if (!$result['ok']) {
            $this->back('/items', implode(' ', $result['errors']));
        }
        Session::flash('success', $result['created'] ? 'Item added' : 'Item updated');
        $this->redirect('/items');
    }

    public function delete(): void
    {
        $this->requirePermission('manage_items');
        $this->requireCsrf('/items');

        try {
            $result = (new Item())->delete((int) ($_POST['id'] ?? 0), $this->workspaceId());
        } catch (RuntimeException $e) {
            $this->back('/items', $e->getMessage());
        }
        if (!$result['ok']) {
            $this->back('/items', $result['error']);
        }
        Session::flash('success', 'Item deleted');
        $this->redirect('/items');
    }
}