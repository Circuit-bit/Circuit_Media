<main>
  <section class="hero shell">
    <div class="hero-copy">
      <p class="hero-eyebrow">Smartphone · Tech Review · Community</p>
      <h1>
        Circuit Media
        <span>Real context for smarter tech choices.</span>
      </h1>
      <p>
        Specs and photos for <?= e(number_format((int) $totalDevices)) ?> phones, tablets and watches across <?= e((string) $brandCount) ?> brands —
        with recommendations you can audit.
      </p>
      <div class="hero-actions">
        <a class="primary-button" href="<?= e(url('/recommend')) ?>">Get started →</a>
        <a class="soft-button" href="<?= e(url('/compare')) ?>">How compare works</a>
      </div>
      <a class="hero-video-link" href="<?= e(url('/search')) ?>"><span aria-hidden="true">▶</span> Search devices</a>
      <form class="search-box" action="<?= e(url('/search')) ?>" method="get">
        <input type="search" name="q" placeholder="Search phones, tablets, watches…" aria-label="Search devices" />
        <button type="submit" class="primary-button">Search</button>
      </form>
    </div>
    <div class="hero-visual">
      <div class="hero-visual-frame">
        <picture>
          <source srcset="<?= e(asset('assets/img/hero-device.webp')) ?>" type="image/webp" />
          <img src="<?= e(asset('assets/img/hero-device.png')) ?>" alt="Flagship phones" width="1001" height="496" decoding="async" />
        </picture>
      </div>
      <div class="hero-float-card">
        <strong><?= e((string) $brandCount) ?>+ brands</strong>
        <span><?= e(number_format((int) $totalDevices)) ?> devices</span>
      </div>
    </div>
  </section>

  <section class="quick-categories shell" aria-label="Browse categories">
    <a href="<?= e(url('/devices')) ?>"><span class="category-glyph">▦</span><div><strong>Devices</strong><small>Phones, tablets & watches</small></div><b>↗</b></a>
    <a href="<?= e(url('/phones')) ?>"><span class="category-glyph">▯</span><div><strong>Phones</strong><small>Smartphones to browse</small></div><b>↗</b></a>
    <a href="<?= e(url('/brands')) ?>"><span class="category-glyph">▦</span><div><strong>Brands</strong><small><?= e((string) $brandCount) ?> manufacturers covered</small></div><b>↗</b></a>
    <a href="<?= e(url('/recommend')) ?>"><span class="category-glyph">◉</span><div><strong>Recommend</strong><small>Match a device to your use</small></div><b>↗</b></a>
  </section>

  <section class="content-section shell">
    <div class="section-heading">
      <span class="section-kicker">Trending now</span>
      <h2>What people are researching</h2>
      <a href="<?= e(url('/search')) ?>">Browse all</a>
    </div>
    <div class="device-grid four">
      <?php foreach (array_slice($popular ?? [], 0, 4) as $device): ?>
        <?php partial('device-card', ['device' => $device]); ?>
      <?php endforeach; ?>
    </div>
  </section>

  <section class="compare-band">
    <div class="shell compare-band-inner">
      <div class="compare-copy">
        <span class="section-kicker">Decision engine</span>
        <h2>Tell us how you use it.<br />We'll shortlist it.</h2>
        <p>Pick a use case—gaming, photography, battery, budget—set your budget, and get ranked recommendations with the exact spec evidence behind each pick.</p>
        <a class="primary-button" href="<?= e(url('/recommend')) ?>">Get my recommendation <span>↗</span></a>
      </div>
      <div class="comparison-preview">
        <div class="preview-heading"><span>AI recommendation</span><span>Photography · under $1,100</span></div>
        <div class="preview-products">
          <?php foreach ($compareDefaults ?? [] as $index => $device): ?>
            <?php if ($index === 1): ?><div class="versus">VS</div><?php endif; ?>
            <div><strong><?= e(($device['brand'] ?? '') . ' ' . ($device['model'] ?? '')) ?></strong><small>Ranked pick</small></div>
          <?php endforeach; ?>
        </div>
        <small class="preview-disclaimer">Rankings change with your priorities — and we show the math.</small>
      </div>
    </div>
  </section>

  <?php if (!empty($latest)): ?>
  <section class="content-section shell">
    <div class="section-heading">
      <span class="section-kicker">Fresh arrivals</span>
      <h2>Recently tracked</h2>
    </div>
    <div class="device-grid four">
      <?php foreach (array_slice($latest, 0, 4) as $device): ?>
        <?php partial('device-card', ['device' => $device]); ?>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endif; ?>
</main>
