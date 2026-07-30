<?php
/** @var array $device */
/** @var bool $featured */
$featured = !empty($featured);
$href = device_path($device);
$img = $device['image']['url'] ?? null;
$brand = (string) ($device['brand'] ?? '');
$model = (string) ($device['model'] ?? '');
$category = (string) ($device['category'] ?? 'phone');
$name = trim($brand . ' ' . $model);
$score = isset($device['score']) ? (float) $device['score'] : 0.0;
$year = '';
if (!empty($device['releaseDate'])) {
    $year = substr((string) $device['releaseDate'], 0, 4);
}
$price = $device['startingPrice'] ?? null;
$priceLabel = is_numeric($price) ? 'From $' . number_format((float) $price) : 'Price varies by region';
$compareHref = url('/compare?devices=' . rawurlencode((string) ($device['id'] ?? '')));
$accent = (string) ($device['accent'] ?? '#ff7a3d');
?>
<article class="device-card catalog-device-card<?= $featured ? ' featured' : '' ?>">
  <a href="<?= e($href) ?>" class="device-card-visual" aria-label="Open <?= e($name) ?>" style="--device-accent: <?= e($accent) ?>">
    <?php if ($img): ?>
      <img class="catalog-photo" src="<?= e($img) ?>" alt="<?= e($name) ?>" loading="lazy" width="240" height="240" />
    <?php else: ?>
      <img class="catalog-photo catalog-photo-showcase" src="<?= e(device_showcase_asset($category)) ?>" alt="" aria-hidden="true" loading="lazy" width="240" height="240" />
    <?php endif; ?>
  </a>
  <div class="device-card-body">
    <div class="eyebrow-row">
      <span><?= e($brand) ?></span>
      <strong><?= e(number_format($score, 1)) ?></strong>
    </div>
    <h3><a href="<?= e($href) ?>"><?= e($model) ?></a></h3>
    <p><?= e((string) ($device['summary'] ?? ($name . ' — open for full specifications and photos.'))) ?></p>
    <div class="device-card-meta">
      <span><?= e($priceLabel) ?></span>
      <span><?= e($year !== '' ? $year : '—') ?></span>
    </div>
    <div class="card-actions">
      <a class="text-link" href="<?= e($href) ?>">Specs &amp; photos <span>↗</span></a>
      <a class="compare-add" href="<?= e($compareHref) ?>">+ Compare</a>
    </div>
  </div>
</article>
