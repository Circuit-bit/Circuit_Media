<?php $site = app_config('site'); ?>
<header class="site-header">
  <a class="brand brand-logo" href="<?= e(url('/')) ?>" aria-label="Circuit Media home">
    <img src="<?= e(asset($site['logo'])) ?>" alt="Circuit Media" class="brand-logo-img" width="44" height="44" />
    <span class="brand-wordmark">Circuit Media</span>
  </a>
  <nav id="primary-nav" class="primary-nav" aria-label="Main navigation">
    <?php foreach ($site['navigation'] as $item): ?>
      <a href="<?= e(url($item['href'])) ?>"><?= e($item['label']) ?></a>
    <?php endforeach; ?>
    <a href="<?= e(url('/search')) ?>" class="mobile-search-link">Search</a>
    <a href="<?= e(url('/recommend')) ?>" class="mobile-cta-link">Get started</a>
  </nav>
  <div class="header-actions">
    <a class="ghost-button header-search" href="<?= e(url('/search')) ?>">Search</a>
    <a class="primary-button header-cta" href="<?= e(url('/recommend')) ?>">Get started</a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="primary-nav" data-menu-toggle>Menu</button>
  </div>
  <button type="button" class="nav-backdrop" aria-label="Close menu" data-menu-close hidden></button>
</header>
