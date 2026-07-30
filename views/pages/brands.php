<?php
/** @var array $brands */
/** @var int|string $totalDevices */
$brands = $brands ?? [];
$brandCount = count($brands);
$totalDevices = (int) ($totalDevices ?? 0);
?>
<main>
  <section class="search-hero">
    <div class="shell">
      <span class="section-kicker lime">Live catalog</span>
      <h1>Every brand.</h1>
      <p class="brands-hero-copy">
        <?= e(number_format($brandCount)) ?> brands and <?= e(number_format($totalDevices)) ?> devices, in the live catalog. Open any brand to browse its full catalog.
      </p>
    </div>
  </section>

  <section class="shell brands-directory-section">
    <div class="brand-directory">
      <?php foreach ($brands as $brand): ?>
        <?php
          $slug = (string) ($brand['brandSlug'] ?? slugify($brand['name'] ?? ''));
          $href = url('/brands/' . rawurlencode($slug));
          $count = (int) ($brand['deviceCount'] ?? 0);
        ?>
        <a class="brand-tile" href="<?= e($href) ?>">
          <strong><?= e((string) ($brand['name'] ?? '')) ?></strong>
          <span><?= e(number_format($count)) ?> devices</span>
          <b>↗</b>
        </a>
      <?php endforeach; ?>
    </div>
  </section>
</main>
