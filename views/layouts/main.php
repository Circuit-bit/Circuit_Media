<?php
/** @var string $content */
/** @var string $title */
/** @var string $description */
/** @var array $site */
$site = $site ?? app_config('site');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= e($title ?? $site['name']) ?></title>
  <meta name="description" content="<?= e($description ?? $site['description']) ?>" />
  <link rel="icon" href="<?= e(asset('assets/img/circuit-media-mark.png')) ?>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --font-body: "Manrope", system-ui, sans-serif;
      --font-display: "Plus Jakarta Sans", system-ui, sans-serif;
      --font-geist-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    }
    body { font-family: var(--font-body); }
    h1, h2, h3, .brand-wordmark { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.03em; }
  </style>
  <link rel="stylesheet" href="<?= e(asset('assets/css/app.css')) ?>?v=20260730k" />
  <script>window.CM_BASE = <?= json_encode(base_path()) ?>;</script>
</head>
<body>
  <div class="site-frame">
    <?php partial('header'); ?>
    <?= $content ?>
    <?php partial('footer'); ?>
  </div>
  <script src="<?= e(asset('assets/js/app.js')) ?>?v=20260730k" defer></script>
</body>
</html>
