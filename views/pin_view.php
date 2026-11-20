<div id="auth">
  <div class="authcard">
    <h2>Hi, <?= e($person) ?></h2>
    <p class="muted">Enter your 6-digit PIN</p>
    <form method="post" action="<?= e($base . '/w/' . $workspace['slug'] . '/pin') ?>" class="stack" data-validate novalidate>
      <?= Csrf::field() ?>
      <label>PIN<input class="pin" type="password" name="pin" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" autofocus required></label>
      <p class="err" role="alert"><?= e($flash['error'] ?? '') ?></p>
      <button class="btn big" type="submit">Log in</button>
    </form>
    <a class="linkbtn" href="<?= e($base . $backPath) ?>">Not you? Go back</a>
  </div>
</div>
