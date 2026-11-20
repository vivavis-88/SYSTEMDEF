<div id="auth">
  <div class="authcard">
    <img class="biglogo" src="<?= e($base) ?>/assets/img/logo.png" alt="" onerror="this.style.display='none'">
    <h2><?= e($workspace['name']) ?></h2>
    <p class="muted">Log in as:</p>
    <p class="err" role="alert"><?= e($flash['error'] ?? '') ?></p>

    <?php if ((int) $workspace['show_member_list']): ?>
      <?php if ($cashiers): ?>
        <div class="pick">
          <?php foreach ($cashiers as $c): ?>
            <a href="<?= e($base . '/w/' . $workspace['slug'] . '/as/' . $c['id']) ?>">
              <span class="avatar"><?= e(mb_strtoupper(mb_substr($c['display_name'], 0, 1))) ?></span>
              <span><?= e($c['display_name']) ?><small>cashier</small></span>
            </a>
          <?php endforeach; ?>
        </div>
      <?php else: ?>
        <p class="muted">No cashiers yet.</p>
      <?php endif; ?>
    <?php else: ?>
      <form method="post" action="<?= e($base . '/w/' . $workspace['slug'] . '/by-name') ?>" class="stack" data-validate novalidate>
        <?= Csrf::field() ?>
        <label>Your name<input type="text" name="name" maxlength="80" autocomplete="off" required></label>
        <label>PIN<input class="pin" type="password" name="pin" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="000000" required></label>
        <p class="err" role="alert"></p>
        <button class="btn big" type="submit">Log in</button>
      </form>
    <?php endif; ?>

    <a class="linkbtn" href="<?= e($base . '/w/' . $workspace['slug'] . '/staff') ?>">Owner / Admin login</a>
  </div>
</div>
