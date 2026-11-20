<?php
/* AMAYA Booth - tiny JSON API. Stores everything in data/db.json (no database needed). */
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($a, $code = 200) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }
function t($x) { return trim((string)($x ?? '')); }
function k($x) { return strtolower(t($x)); }
function newId() { return substr(bin2hex(random_bytes(5)), 0, 9); }
function fresh() {
  return ['rev' => 0,
    'settings' => ['eventName' => 'AMAYA Booth', 'numDays' => 4, 'shareRate' => 15, 'amayaOwners' => 'AMAYA',
      'days' => ['1' => '2026-11-10', '2' => '2026-11-11', '3' => '2026-11-12', '4' => '2026-11-13']],
    'users' => [], 'categories' => [], 'items' => [], 'sales' => []];
}
$PALETTE = ['#7c3aed', '#db2777', '#0891b2', '#16a34a', '#ea580c', '#ca8a04', '#2563eb', '#dc2626', '#0d9488', '#64748b'];
function okColor($c, $i) { global $PALETTE; return preg_match('/^#[0-9a-fA-F]{6}$/', (string)$c) ? strtolower($c) : $PALETTE[$i % count($PALETTE)]; }
function ensureCategory(&$s, $name) {
  $name = t($name); if ($name === '') return '';
  foreach ($s['categories'] as $c) if (k($c['name']) === k($name)) return $c['id'];
  $c = ['id' => newId(), 'name' => $name, 'color' => okColor('', count($s['categories']))]; $s['categories'][] = $c; return $c['id'];
}
function cleanItem($d, $s = null) {
  $name = t($d['name'] ?? ''); $owner = t($d['owner'] ?? '');
  if ($name === '') throw new Exception('Item name is required.');
  if ($owner === '') throw new Exception('Owner is required.');
  $qty = (!isset($d['qty']) || $d['qty'] === '' || $d['qty'] === null) ? null : max(0, (int)floor((float)$d['qty']));
  $cat = '';
  if (!empty($d['category']) && $s) foreach (($s['categories'] ?? []) as $c) if ($c['id'] === $d['category']) $cat = $c['id'];
  return ['name' => $name, 'owner' => $owner, 'price' => max(0, round((float)($d['price'] ?? 0), 2)), 'qty' => $qty, 'category' => $cat];
}
function same($a, $b) { return k($a['name']) === k($b['name']) && k($a['owner']) === k($b['owner']) && (float)$a['price'] === (float)$b['price']; }
function numDays($s) { $n = (int)($s['settings']['numDays'] ?? 4); if ($n < 1) $n = 4; foreach ($s['sales'] as $x) if ((int)$x['day'] > $n) $n = (int)$x['day']; return $n; }
function findIdx($s, $id) { foreach ($s['items'] as $i => $it) if ($it['id'] === $id) return $i; return -1; }

function adminCount($s) { $n = 0; foreach ($s['users'] as $u) if (($u['role'] ?? '') === 'admin') $n++; return $n; }
function apply(&$s, $op, $d) {
  if (!isset($s['users']) || !is_array($s['users'])) $s['users'] = [];
  if (!isset($s['categories']) || !is_array($s['categories'])) $s['categories'] = [];
  switch ($op) {
    case 'addItem':
      $it = cleanItem($d, $s);
      foreach ($s['items'] as $x) if (same($x, $it)) throw new Exception('That item already exists.');
      $it['id'] = newId(); $s['items'][] = $it; break;
    case 'addItemsBulk':
      foreach (($d['items'] ?? []) as $raw) {
        $n = cleanItem($raw, $s); if (!empty($raw['categoryName'])) $n['category'] = ensureCategory($s, $raw['categoryName']); $dup = false;
        foreach ($s['items'] as &$x) if (same($x, $n)) { $dup = true; if (empty($x['category']) && !empty($n['category'])) $x['category'] = $n['category']; break; }
        unset($x);
        if (!$dup) { $n['id'] = newId(); $s['items'][] = $n; }
      } break;
    case 'updateItem':
      $i = findIdx($s, $d['id'] ?? ''); if ($i < 0) throw new Exception('Item not found.');
      $n = cleanItem($d, $s);
      if (!array_key_exists('category', $d)) unset($n['category']);
      $s['items'][$i] = array_merge($s['items'][$i], $n);
      foreach ($s['sales'] as &$x) if ($x['itemId'] === $d['id']) { $x['itemName'] = $n['name']; $x['owner'] = $n['owner']; }
      unset($x); break;
    case 'deleteItem':
      foreach ($s['sales'] as $x) if ($x['itemId'] === ($d['id'] ?? '')) throw new Exception('This item already has sales. Delete those sales first.');
      $s['items'] = array_values(array_filter($s['items'], function ($i) use ($d) { return $i['id'] !== ($d['id'] ?? ''); })); break;
    case 'addSale':
      $i = findIdx($s, $d['itemId'] ?? ''); if ($i < 0) throw new Exception('Pick an item first.');
      $item = $s['items'][$i];
      $qty = (int)floor((float)($d['qty'] ?? 0)); if ($qty < 1) throw new Exception('Quantity must be at least 1.');
      $price = (!isset($d['price']) || $d['price'] === '' || $d['price'] === null) ? (float)$item['price'] : max(0, (float)$d['price']);
      $day = (int)floor((float)($d['day'] ?? 1)); if ($day < 1) $day = 1;
      $s['sales'][] = ['id' => newId(), 'ts' => date('c'), 'day' => $day, 'itemId' => $item['id'], 'itemName' => $item['name'],
        'owner' => $item['owner'], 'price' => $price, 'qty' => $qty, 'total' => round($price * $qty, 2), 'cashier' => t($d['cashier'] ?? '')];
      break;
    case 'deleteSale':
      $s['sales'] = array_values(array_filter($s['sales'], function ($x) use ($d) { return $x['id'] !== ($d['id'] ?? ''); })); break;
    case 'setSettings':
      if (isset($d['eventName'])) $s['settings']['eventName'] = t($d['eventName']) ?: 'AMAYA Booth';
      if (isset($d['shareRate'])) $s['settings']['shareRate'] = min(100, max(0, (float)$d['shareRate']));
      if (isset($d['amayaOwners'])) $s['settings']['amayaOwners'] = t($d['amayaOwners']);
      if (isset($d['days']) && is_array($d['days'])) foreach ($d['days'] as $dk => $dv) $s['settings']['days'][(string)$dk] = t($dv);
      break;
    case 'addDay':
      $n = numDays($s) + 1; $prev = $s['settings']['days'][(string)($n - 1)] ?? ''; $nd = '';
      if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $prev)) $nd = date('Y-m-d', strtotime($prev . ' +1 day'));
      $s['settings']['numDays'] = $n; $s['settings']['days'][(string)$n] = $nd; break;
    case 'removeDay':
      $m = numDays($s); if ($m <= 1) throw new Exception('You need at least one day.');
      foreach ($s['sales'] as $x) if ((int)$x['day'] === $m) throw new Exception('Day ' . $m . ' has sales. Delete them first.');
      unset($s['settings']['days'][(string)$m]); $s['settings']['numDays'] = $m - 1; break;
    case 'addCategory':
      $cn = t($d['name'] ?? ''); if ($cn === '') throw new Exception('Category name is required.');
      foreach ($s['categories'] as $c) if (k($c['name']) === k($cn)) throw new Exception('That category already exists.');
      $s['categories'][] = ['id' => newId(), 'name' => $cn, 'color' => okColor($d['color'] ?? '', count($s['categories']))]; break;
    case 'updateCategory':
      $ci = -1; foreach ($s['categories'] as $i => $c) if ($c['id'] === ($d['id'] ?? '')) $ci = $i;
      if ($ci < 0) throw new Exception('Category not found.');
      if (isset($d['name'])) {
        $nn = t($d['name']); if ($nn === '') throw new Exception('Category name is required.');
        foreach ($s['categories'] as $c) if ($c['id'] !== $d['id'] && k($c['name']) === k($nn)) throw new Exception('That category already exists.');
        $s['categories'][$ci]['name'] = $nn;
      }
      if (isset($d['color'])) $s['categories'][$ci]['color'] = okColor($d['color'], 0);
      break;
    case 'deleteCategory':
      $s['categories'] = array_values(array_filter($s['categories'], function ($c) use ($d) { return $c['id'] !== ($d['id'] ?? ''); }));
      foreach ($s['items'] as &$it2) if (($it2['category'] ?? '') === ($d['id'] ?? '')) $it2['category'] = '';
      unset($it2); break;
    case 'setItemCategory':
      $i = findIdx($s, $d['id'] ?? ''); if ($i < 0) throw new Exception('Item not found.');
      $val = '';
      foreach ($s['categories'] as $c) if ($c['id'] === ($d['category'] ?? '')) $val = $c['id'];
      $s['items'][$i]['category'] = $val; break;
    case 'addUser':
      $nm = t($d['name'] ?? ''); if ($nm === '') throw new Exception('Name is required.');
      if (empty($d['pinHash']) || empty($d['salt'])) throw new Exception('PIN is required.');
      if (!in_array($d['role'] ?? '', ['admin', 'cashier'], true)) throw new Exception('Pick a role.');
      foreach ($s['users'] as $u) if (k($u['name']) === k($nm)) throw new Exception('That name is already used.');
      $s['users'][] = ['id' => newId(), 'name' => $nm, 'role' => $d['role'], 'salt' => (string)$d['salt'], 'pinHash' => (string)$d['pinHash']]; break;
    case 'updateUser':
      $ui = -1; foreach ($s['users'] as $i => $u) if ($u['id'] === ($d['id'] ?? '')) $ui = $i;
      if ($ui < 0) throw new Exception('Person not found.');
      if (!empty($d['role']) && $d['role'] !== $s['users'][$ui]['role']) {
        if ($s['users'][$ui]['role'] === 'admin' && adminCount($s) < 2) throw new Exception('Keep at least one admin.');
        $s['users'][$ui]['role'] = $d['role'];
      }
      if (!empty($d['pinHash']) && !empty($d['salt'])) { $s['users'][$ui]['salt'] = (string)$d['salt']; $s['users'][$ui]['pinHash'] = (string)$d['pinHash']; }
      break;
    case 'deleteUser':
      $ui = -1; foreach ($s['users'] as $i => $u) if ($u['id'] === ($d['id'] ?? '')) $ui = $i;
      if ($ui < 0) throw new Exception('Person not found.');
      if ($s['users'][$ui]['role'] === 'admin' && adminCount($s) < 2) throw new Exception('Keep at least one admin.');
      $s['users'] = array_values(array_filter($s['users'], function ($u) use ($d) { return $u['id'] !== $d['id']; })); break;
    case 'resetSales': $s['sales'] = []; break;
    case 'importAll':
      $im = $d['state'] ?? null;
      if (!is_array($im) || !isset($im['items'], $im['sales']) || !is_array($im['items']) || !is_array($im['sales'])) throw new Exception('That file is not a valid backup.');
      if (isset($im['settings']) && is_array($im['settings'])) $s['settings'] = $im['settings'];
      $s['items'] = $im['items']; $s['sales'] = $im['sales']; if (isset($im['users']) && is_array($im['users'])) $s['users'] = $im['users']; if (isset($im['categories']) && is_array($im['categories'])) $s['categories'] = $im['categories']; break;
    default: throw new Exception('Unknown action.');
  }
  $s['rev'] = ($s['rev'] ?? 0) + 1;
}

$dir = __DIR__ . '/data';
if (!is_dir($dir)) @mkdir($dir, 0775, true);
$fh = @fopen($dir . '/db.json', 'c+');
if (!$fh) out(['error' => 'Cannot write to the data folder. Check folder permissions.'], 500);
$post = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
flock($fh, $post ? LOCK_EX : LOCK_SH);
$raw = stream_get_contents($fh);
$s = $raw ? json_decode($raw, true) : null;
if (!is_array($s)) $s = fresh();

if (!$post) { flock($fh, LOCK_UN); out($s); }

$in = json_decode(file_get_contents('php://input'), true);
try {
  apply($s, (string)($in['op'] ?? ''), is_array($in['data'] ?? null) ? $in['data'] : []);
} catch (Exception $e) {
  flock($fh, LOCK_UN); out(['error' => $e->getMessage()], 400);
}
ftruncate($fh, 0); rewind($fh);
fwrite($fh, json_encode($s, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
fflush($fh); flock($fh, LOCK_UN);
out($s);
