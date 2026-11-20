<div id="auth">
  <div class="authcard">
    <h2><?= e($appName) ?></h2>
    <p class="muted">Open your workspace</p>
    <form method="get" action="<?= e($base) ?>/login" class="stack" data-validate novalidate>
      <label>Workspace address
        <input type="text" name="slug" value="<?= e($slug ?? '') ?>" placeholder="amaya-booth" maxlength="40" autocomplete="off" autofocus required>
      </label>
      <p class="err" role="alert"><?= e($flash['error'] ?? '') ?></p>
      <button class="btn big" type="submit">Continue</button>
    </form>
  </div>
</div>
