<?php require BASE_PATH . '/views/layout/icons_view.php'; ?>
<div class="app" id="app">
<aside>
  <div class="brand">
    <img id="logo" class="logo" src="<?= e($base) ?>/assets/img/logo.png" alt="" onerror="this.style.display='none'">
    <b id="title"><?= e($user['workspace_name'] ?? $appName) ?></b>
  </div>
  <nav id="tabs" aria-label="Main">
    <?php foreach ($nav as $n): ?>
      <?php if ($n['ready']): ?>
        <a href="<?= e($base . $n['path']) ?>" class="<?= $n['key'] === $active ? 'on' : '' ?>"<?= $n['key'] === $active ? ' aria-current="page"' : '' ?>>
          <svg class="i"><use href="#<?= e($n['icon']) ?>"/></svg><span class="lbl"><?= e($n['label']) ?></span>
        </a>
      <?php else: ?>
        <a class="soon" aria-disabled="true" tabindex="-1" title="Coming soon">
          <svg class="i"><use href="#<?= e($n['icon']) ?>"/></svg><span class="lbl"><?= e($n['label']) ?></span>
        </a>
      <?php endif; ?>
    <?php endforeach; ?>
  </nav>
  <div class="foot">
    <button id="collapse" type="button" aria-label="Collapse menu"><svg class="i"><use href="#panel"/></svg><span class="lbl">Collapse</span></button>
  </div>
</aside>
<div class="main">
  <header>
    <div><h1 id="greet"><?= e($heading) ?></h1><p id="sub"><?= e($subheading) ?></p></div>
    <span class="sp"></span>
    <span class="badge"><?= e(ucfirst($user['account_type'] ?? '')) ?></span>
    <button class="ibtn" id="theme" type="button" aria-label="Change theme"><svg class="i"><use href="#theme-ic"/></svg></button>
    <span class="who"><?= e($user['role'] ?? '') ?>
      <form method="post" action="<?= e($base) ?>/logout"><?= Csrf::field() ?><button type="submit">Log out</button></form>
    </span>
  </header>
  <main id="view" class="anim">