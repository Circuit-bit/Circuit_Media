<?php
/** @var string $slug */
/** @var array $result */
/** @var array $neighbors */
$result = $result ?? [];
$neighbors = $neighbors ?? [];
$brandName = (string) ($result['brand']['name'] ?? $slug ?? 'Brand');
$deviceCount = (int) ($result['total'] ?? $result['brand']['deviceCount'] ?? 0);
?>
<main>
  <section class="category-hero phone-hero">
    <div class="shell">
      <span class="section-kicker lime">Live brand catalog</span>
      <h1><?= e($brandName) ?><mark>.</mark></h1>
      <p>All <?= e(number_format($deviceCount)) ?> devices listed under <?= e($brandName) ?> — phones, tablets and wearables, with live specs and photos.</p>
      <div class="category-meta">
        <span><?= e(number_format($deviceCount)) ?> devices</span>
        <span>Paginated live</span>
        <a href="<?= e(url('/brands')) ?>">All brands</a>
      </div>
    </div>
  </section>

  <section class="live-catalog-section shell">
    <div class="live-catalog-heading">
      <h2>All <?= e($brandName) ?> devices</h2>
      <div class="catalog-count">
        <strong><?= e(number_format($deviceCount)) ?></strong>
        <span>devices</span>
      </div>
    </div>
    <div class="device-grid three">
      <?php foreach ($result['devices'] ?? [] as $device): ?>
        <?php partial('device-card', ['device' => $device]); ?>
      <?php endforeach; ?>
    </div>
    <?php if (($result['totalPages'] ?? 1) > 1): ?>
      <nav class="catalog-pagination">
        <?php if (!empty($result['hasPrevious'])): ?>
          <a href="?page=<?= (int) $result['page'] - 1 ?>">← Previous</a>
        <?php endif; ?>
        <span>Page <?= (int) ($result['page'] ?? 1) ?><?= !empty($result['totalPages']) ? ' / ' . (int) $result['totalPages'] : '' ?></span>
        <?php if (!empty($result['hasNext'])): ?>
          <a href="?page=<?= (int) $result['page'] + 1 ?>">Next →</a>
        <?php endif; ?>
      </nav>
    <?php endif; ?>
  </section>

  <?php if ($neighbors !== []): ?>
  <section class="shell brands-neighbors-section">
    <div class="section-heading">
      <div>
        <span class="section-kicker">More brands</span>
        <h2>Also browsing</h2>
      </div>
    </div>
    <div class="chip-row wrap brands-neighbor-chips">
      <?php foreach ($neighbors as $item): ?>
        <a class="chip" href="<?= e(url('/brands/' . rawurlencode((string) ($item['brandSlug'] ?? '')))) ?>">
          <?= e((string) ($item['name'] ?? '')) ?>
        </a>
      <?php endforeach; ?>
      <a class="chip" href="<?= e(url('/brands')) ?>">View all brands</a>
    </div>
  </section>
  <?php endif; ?>
</main>
