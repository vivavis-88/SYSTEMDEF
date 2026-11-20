<div class="card">
  <h2>You are signed in</h2>
  <p class="muted">Login works. The real screens (Sell, Items, Sales log) are built next.</p>
</div>

<div class="card">
  <h2>What your role can do</h2>
  <?php if (!empty($user['perms'])): ?>
    <p class="muted"><?= e(implode(', ', $user['perms'])) ?></p>
  <?php else: ?>
    <p class="muted">No permissions found. Check that seed.sql filled the role_permissions table.</p>
  <?php endif; ?>
</div>