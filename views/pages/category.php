<?php
/** @var string $label */
/** @var string $category */
/** @var array $result */
/** @var string $brand */
/** @var string $query */
/** @var int $totalDevices */
/** @var int $brandCount */
$category = $category ?? 'all';
$label = $label ?? 'Devices';
$result = $result ?? ['devices' => [], 'total' => 0, 'page' => 1, 'totalPages' => 1];
$brand = $brand ?? '';
$query = $query ?? '';
$totalDevices = (int) ($totalDevices ?? ($result['total'] ?? 0));
$brandCount = (int) ($brandCount ?? 0);

$copy = match ($category) {
    'phone' => [
        'title' => 'Phones',
        'kicker' => 'Pocket computers',
        'description' => 'Flagship cameras, battery-first bargains, and everything between — compared with evidence.',
        'catalogTitle' => 'All smartphones',
        'heroClass' => 'category-phone',
    ],
    'tablet' => [
        'title' => 'Tablets',
        'kicker' => 'Big-screen shortlist',
        'description' => 'Creative canvases, work companions, and family screens with live specs and photos.',
        'catalogTitle' => 'All tablets',
        'heroClass' => 'category-tablet',
    ],
    'watch' => [
        'title' => 'Watches',
        'kicker' => 'Wearable intelligence',
        'description' => 'Health sensors, fitness tools, battery life and compatibility — verified side by side.',
        'catalogTitle' => 'All smartwatches',
        'heroClass' => 'category-watch',
    ],
    default => [
        'title' => 'Devices',
        'kicker' => 'Full live catalog',
        'description' => 'Phones, tablets, and watches in one place — filter by type, then open any model for live specs and photos.',
        'catalogTitle' => 'All devices',
        'heroClass' => 'category-phone',
    ],
};

$filters = [
    ['key' => 'all', 'label' => 'All devices', 'glyph' => '▦', 'glyphClass' => 'phone-glyph', 'href' => url('/devices')],
    ['key' => 'phone', 'label' => 'Phones', 'glyph' => '▯', 'glyphClass' => 'phone-glyph', 'href' => url('/devices?category=phone')],
    ['key' => 'tablet', 'label' => 'Tablets', 'glyph' => '▭', 'glyphClass' => 'tablet-glyph', 'href' => url('/devices?category=tablet')],
    ['key' => 'watch', 'label' => 'Watches', 'glyph' => '◉', 'glyphClass' => 'watch-glyph', 'href' => url('/devices?category=watch')],
];

$page = max(1, (int) ($result['page'] ?? 1));
$totalPages = max(1, (int) ($result['totalPages'] ?? 1));
$queryArgs = array_filter([
    'category' => $category !== 'all' ? $category : null,
    'q' => $query !== '' ? $query : null,
    'brand' => $brand !== '' ? $brand : null,
]);
?>
<main>
  <section class="category-hero <?= e($copy['heroClass']) ?>">
    <div class="shell">
      <span class="section-kicker lime"><?= e($copy['kicker']) ?></span>
      <h1><?= e($copy['title']) ?><mark>.</mark></h1>
      <p><?= e($copy['description']) ?></p>
      <form class="search-box" action="<?= e(url('/search')) ?>" method="get">
        <?php if ($category !== 'all'): ?>
          <input type="hidden" name="category" value="<?= e($category) ?>" />
        <?php endif; ?>
        <input type="search" name="q" value="<?= e($query) ?>" placeholder="Search brand or model" aria-label="Search devices" />
        <button type="submit">Search</button>
      </form>
      <div class="category-meta">
        <span><?= e(number_format($totalDevices)) ?> live devices</span>
        <span><?= e(number_format($brandCount)) ?> brands</span>
        <a href="<?= e(url('/brands')) ?>">Browse by brand</a>
      </div>
    </div>
  </section>

  <section class="device-type-bar shell" aria-label="Device type">
    <div class="device-type-switch" role="tablist" aria-label="Filter by device type">
      <?php foreach ($filters as $filter): ?>
        <?php $active = $filter['key'] === $category; ?>
        <a href="<?= e($filter['href']) ?>"
           role="tab"
           aria-selected="<?= $active ? 'true' : 'false' ?>"
           class="<?= $active ? 'is-active' : '' ?>">
          <span class="category-glyph <?= e($filter['glyphClass']) ?>" aria-hidden="true"><?= e($filter['glyph']) ?></span>
          <strong><?= e($filter['label']) ?></strong>
        </a>
      <?php endforeach; ?>
    </div>
  </section>

  <section class="live-catalog-section shell">
    <div class="live-catalog-heading">
      <div>
        <span class="section-kicker">Live device catalog</span>
        <h2><?= e($copy['catalogTitle']) ?></h2>
      </div>
      <div class="catalog-count">
        <strong><?= e(number_format((int) ($result['total'] ?? 0))) ?></strong>
        <span>devices available</span>
      </div>
    </div>
    <p class="catalog-disclosure">Regional variants and availability may differ.</p>

    <?php if (($result['devices'] ?? []) === []): ?>
      <div class="empty-state">
        <span aria-hidden="true">⌕</span>
        <h2>No devices found</h2>
        <p>Try another type filter, or search from the hero box above.</p>
      </div>
    <?php else: ?>
      <div class="device-grid four">
        <?php foreach ($result['devices'] as $device): ?>
          <?php partial('device-card', ['device' => $device]); ?>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <?php if ($totalPages > 1): ?>
      <nav class="catalog-pagination" aria-label="Pagination">
        <?php if (!empty($result['hasPrevious'])): ?>
          <a href="<?= e(url('/devices?' . http_build_query($queryArgs + ['page' => $page - 1]))) ?>">Previous</a>
        <?php else: ?>
          <span>Previous</span>
        <?php endif; ?>
        <span>Page <?= e((string) $page) ?> / <?= e((string) $totalPages) ?></span>
        <?php if (!empty($result['hasNext'])): ?>
          <a href="<?= e(url('/devices?' . http_build_query($queryArgs + ['page' => $page + 1]))) ?>">Next</a>
        <?php else: ?>
          <span>Next</span>
        <?php endif; ?>
      </nav>
    <?php endif; ?>
  </section>
</main>
