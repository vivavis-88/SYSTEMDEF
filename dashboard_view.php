<div class="stats">
  <div class="stat"><span>Role</span><b><?= e(ucfirst($user['role'])) ?></b></div>
  <div class="stat"><span>Workspace type</span><b><?= e(ucfirst($user['account_type'])) ?></b></div>
  <div class="stat"><span>Permissions</span><b><?= count($user['perms']) ?></b></div>
</div>

<div class="card">
  <h2>You are signed in</h2>
  <p class="muted">Login works. The greyed menu items are the next screens to build.</p>
</div>

<div class="card">
  <h2>What your role can do</h2>
  <?php if ($user['perms']): ?>
    <div class="btns">
      <?php foreach ($user['perms'] as $p): ?><span class="pill"><?= e($p) ?></span><?php endforeach; ?>
    </div>
  <?php else: ?>
    <p class="muted">No permissions found. Check that seed.sql filled the role_permissions table.</p>
  <?php endif; ?>
</div>
