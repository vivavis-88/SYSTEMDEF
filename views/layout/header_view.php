<!doctype html>
<html lang="en" data-theme="<?= e($theme) ?>" data-bs-theme="<?= $theme === 'dark' ? 'dark' : 'light' ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= e($pageTitle ?? $appName) ?></title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Sora:wght@300;400;500;600&display=swap">
<!-- DataTables CSS loads first so style.css wins. Bootstrap CSS is not used; modal styles live in style.css. -->
<link rel="stylesheet" href="<?= e($base) ?>/assets/vendor/datatables/dataTables.bootstrap5.min.css">
<link rel="stylesheet" href="<?= e($base) ?>/assets/css/style.css?v=<?= (int) @filemtime(BASE_PATH . '/assets/css/style.css') ?>">
<link rel="stylesheet" href="<?= e($base) ?>/assets/css/shell.css?v=<?= (int) @filemtime(BASE_PATH . '/assets/css/shell.css') ?>">
<link rel="stylesheet" href="<?= e($base) ?>/assets/css/auth.css">
<script>
/* Apply the saved theme and sidebar state before the page paints (no flash). */
try {
  var t = localStorage.getItem('app_theme');
  if (t === 'dark' || t === 'light' || t === 'sand') document.documentElement.dataset.theme = t;
  document.documentElement.dataset.bsTheme = (document.documentElement.dataset.theme === 'dark') ? 'dark' : 'light';
  if (localStorage.getItem('app_nav_c') === '1') document.documentElement.classList.add('nav-c');
} catch (e) {}
</script>
</head>
<body>