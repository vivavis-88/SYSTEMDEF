<div id="auth">
  <div class="authcard">
    <h2><?= e($workspace['name']) ?></h2>
    <p class="muted">Owner / Admin login</p>
    <form method="post" action="<?= e($base . '/w/' . $workspace['slug'] . '/staff') ?>" class="stack" data-validate novalidate>
      <?= Csrf::field() ?>
      <label>Email<input type="email" name="email" autocomplete="username" autofocus required></label>
      <label>Password
        <span class="pwwrap">
          <input type="password" id="pw" name="password" autocomplete="current-password" required>
          <button type="button" class="eye" data-toggle-pw="pw" aria-pressed="false">Show</button>
        </span>
      </label>
      <p class="err" role="alert"><?= e($flash['error'] ?? '') ?></p>
      <button class="btn big" type="submit">Next</button>
    </form>
    <a class="linkbtn" href="<?= e($base . '/w/' . $workspace['slug']) ?>">Back</a>
  </div>
</div>
