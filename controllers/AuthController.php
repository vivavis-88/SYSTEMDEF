<?php
/**
 * Login for a workspace.
 *   Owner / Admin : email + password  ->  6-digit PIN
 *   Cashier       : pick name (or type it) -> 6-digit PIN
 * Emailed codes and trusted devices are added in the next phase.
 */
class AuthController extends BaseController
{
    private const PENDING_SECONDS = 300;
    // A real bcrypt hash of a throwaway string. Checked when the email is unknown so
    // the response takes the same time and does not reveal which emails exist.
    private const DUMMY_HASH = '$2y$10$1BNwbLY74v.QLCsTEzLWX.rOW9O5hVtPOG/c6MI7kRqQD8xe/PvZq';

    // ---------- landing: open a workspace by its address ----------
    public function showLogin(): void
    {
        if (Session::isLoggedIn()) {
            $this->redirect('/dashboard');
        }
        $slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
        $flash = [];
        if ($slug !== '') {
            if ((new Workspace())->findBySlug($slug)) {
                $this->redirect('/w/' . $slug);
            }
            $flash['error'] = 'We could not find that workspace address.';
        }
        $this->render('login', ['slug' => $slug] + ($flash ? ['flash' => $flash] : []));
    }

    // ---------- owner / admin: email + password ----------
    public function showStaffLogin(string $slug): void
    {
        $ws = $this->workspaceOr404($slug);
        $this->render('staff_login', ['workspace' => $ws, 'theme' => $ws['theme']]);
    }

    public function staffLogin(string $slug): void
    {
        $ws   = $this->workspaceOr404($slug);
        $back = "/w/$slug/staff";
        $this->requireCsrf($back);

        $email    = strtolower(trim((string) ($_POST['email'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            $this->back($back, 'Enter your email and password.');
        }

        $user   = (new User())->findByEmail($email);
        $member = $user ? (new Member())->findActive((int) $ws['id'], $user->getId()) : null;

        // Unknown email, or not an owner/admin of this workspace: same message, same timing.
        if (!$user || !$member || !in_array($member['role'], ['owner', 'admin'], true)) {
            password_verify($password, self::DUMMY_HASH);
            $this->back($back, 'Email or password is incorrect.');
        }
        if ($user->isLocked()) {
            $this->back($back, $user->lockMessage());
        }
        if (!$user->checkPassword($password)) {
            $locked = $user->recordFailure();
            $this->back($back, $locked ? $user->lockMessage() : 'Email or password is incorrect.');
        }

        // Password is right. The PIN is step 2.
        Session::set('pending', ['user_id' => $user->getId(), 'ws_id' => (int) $ws['id'], 'slug' => $slug, 'via' => 'staff', 'time' => time()]);
        $this->redirect("/w/$slug/pin");
    }

    // ---------- cashier: pick a card ----------
    public function pickCashier(string $slug, string $id): void
    {
        $ws     = $this->workspaceOr404($slug);
        $userId = ctype_digit($id) ? (int) $id : 0;
        $member = $userId ? (new Member())->findActive((int) $ws['id'], $userId) : null;
        if (!$member || $member['role'] !== 'cashier') {
            $this->back("/w/$slug", 'That person is not available.');
        }
        Session::set('pending', ['user_id' => $userId, 'ws_id' => (int) $ws['id'], 'slug' => $slug, 'via' => 'cashier', 'time' => time()]);
        $this->redirect("/w/$slug/pin");
    }

    // ---------- cashier: member list hidden, type the name + PIN ----------
    public function byName(string $slug): void
    {
        $ws   = $this->workspaceOr404($slug);
        $back = "/w/$slug";
        $this->requireCsrf($back);

        $name = trim((string) ($_POST['name'] ?? ''));
        $pin  = (string) ($_POST['pin'] ?? '');
        if ($name === '' || !preg_match('/^\d{6}$/', $pin)) {
            $this->back($back, 'Enter your name and your 6-digit PIN.');
        }
        $userId = (new Member())->findCashierIdByName((int) $ws['id'], $name);
        $user   = $userId ? (new User())->findById($userId) : null;
        if (!$user) {
            $this->back($back, 'Name or PIN is incorrect.');
        }
        $this->attemptPin($ws, $user, $pin, $back, 'Name or PIN is incorrect.');
    }

    // ---------- step 2: the PIN ----------
    public function showPin(string $slug): void
    {
        $ws      = $this->workspaceOr404($slug);
        $pending = $this->pending($slug);
        $user    = (new User())->findById($pending['user_id']);
        if (!$user) {
            $this->redirect("/w/$slug");
        }
        $this->render('pin', [
            'workspace' => $ws,
            'theme'     => $ws['theme'],
            'person'    => $user->getDisplayName(),
            'backPath'  => $pending['via'] === 'staff' ? "/w/$slug/staff" : "/w/$slug",
        ]);
    }

    public function verifyPin(string $slug): void
    {
        $ws      = $this->workspaceOr404($slug);
        $pending = $this->pending($slug);
        $back    = "/w/$slug/pin";
        $this->requireCsrf($back);

        $pin = (string) ($_POST['pin'] ?? '');
        if (!preg_match('/^\d{6}$/', $pin)) {
            $this->back($back, 'Your PIN is exactly 6 digits.');
        }
        $user = (new User())->findById($pending['user_id']);
        if (!$user) {
            $this->redirect("/w/$slug");
        }
        $this->attemptPin($ws, $user, $pin, $back, 'Incorrect PIN.');
    }

    // ---------- logout ----------
    public function logout(): void
    {
        $slug = Session::user()['workspace_slug'] ?? '';
        $this->requireCsrf('/dashboard');
        Session::flush();
        $this->redirect($slug !== '' ? "/w/$slug" : '/login');
    }

    // ---------- helpers ----------
    /** Check the PIN, count failures, and start the session on success. */
    private function attemptPin(array $ws, User $user, string $pin, string $backPath, string $wrongMessage): void
    {
        $member = (new Member())->findActive((int) $ws['id'], $user->getId());
        if (!$member) {
            $this->back($backPath, $wrongMessage);
        }
        if ($user->isLocked()) {
            $this->back($backPath, $user->lockMessage());
        }
        if (!$user->checkPin($pin)) {
            $locked = $user->recordFailure();
            $this->back($backPath, $locked ? $user->lockMessage() : $wrongMessage);
        }

        $user->clearFailures();
        Session::login([
            'id'             => $user->getId(),
            'name'           => $user->getDisplayName(),
            'workspace_id'   => (int) $ws['id'],
            'workspace_slug' => $ws['slug'],
            'workspace_name' => $ws['name'],
            'account_type'   => $ws['account_type'],
            'role'           => $member['role'],
            'perms'          => (new Role())->permissionsFor((int) $member['role_id']),
            'theme'          => $ws['theme'],
        ]);
        $this->redirect('/dashboard');
    }

    private function workspaceOr404(string $slug): array
    {
        $ws = (new Workspace())->findBySlug($slug);
        if (!$ws) {
            $this->abort(404);
        }
        return $ws;
    }

    /** The half-finished login (password or card done, PIN still to do). Expires after 5 minutes. */
    private function pending(string $slug): array
    {
        $p = Session::get('pending');
        if (!is_array($p) || $p['slug'] !== $slug || time() - (int) $p['time'] > self::PENDING_SECONDS) {
            Session::forget('pending');
            $this->back("/w/$slug", 'Please start again.');
        }
        return $p;
    }
}
