<?php
/** @var array $device */
/** @var array|null $review */
/** @var list<array>|null $related */
$img = $device['image']['url'] ?? null;
$photos = is_array($device['photos'] ?? null) ? $device['photos'] : [];
$scores = is_array($device['componentScores'] ?? null) ? $device['componentScores'] : [];
$features = \App\Services\Catalog::featuresOf($device);
$name = trim(($device['brand'] ?? '') . ' ' . ($device['model'] ?? ''));
$brand = (string) ($device['brand'] ?? '');
$model = (string) ($device['model'] ?? '');
$category = (string) ($device['category'] ?? 'phone');
$accent = (string) ($device['accent'] ?? '#ff7a3d');
$availability = (string) ($device['availability'] ?? 'Check retailers');
if ($availability === '' || preg_match('/see\s+source|not\s+confirmed/i', $availability)) {
    $availability = 'Check retailers';
}
$categoryPath = $category === 'tablet' ? 'tablets' : ($category === 'watch' ? 'watches' : 'phones');
$score = (float) ($device['score'] ?? 0);
$updated = (string) ($device['lastUpdated'] ?? '');
$updatedLabel = $updated !== '' ? date('M j, Y', strtotime($updated) ?: time()) : '—';
$related = is_array($related ?? null) ? $related : [];
$scoreLabels = [
    'performance' => 'Performance',
    'display' => 'Display',
    'camera' => 'Camera',
    'battery' => 'Battery',
    'build' => 'Build',
];
$pros = is_array($device['pros'] ?? null) ? $device['pros'] : [];
$cons = is_array($device['cons'] ?? null) ? $device['cons'] : [];
if ($pros === []) {
    $pros = ['Open the full specification table for details'];
}
if ($cons === []) {
    $cons = ['No notable tradeoffs detected yet'];
}
$gallery = [];
if ($img) {
    $gallery[] = $img;
}
foreach ($photos as $photo) {
    if (!is_array($photo)) {
        continue;
    }
    $url = (string) ($photo['url'] ?? '');
    if ($url === '' || ($img && $url === $img)) {
        continue;
    }
    $gallery[] = $url;
}
$gallery = array_values(array_unique(array_slice($gallery, 0, 6)));
?>
<main>
  <div class="shell">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="<?= e(url('/')) ?>">Home</a>
      <span>/</span>
      <a href="<?= e(url('/' . $categoryPath)) ?>"><?= e($categoryPath) ?></a>
      <span>/</span>
      <strong><?= e($model !== '' ? $model : $name) ?></strong>
    </nav>
  </div>

  <section class="product-hero shell">
    <div class="product-visual-panel live-product-visual" style="--device-accent: <?= e($accent) ?>">
      <?php if ($img): ?>
        <button type="button" class="product-photo-trigger" data-lightbox-src="<?= e($img) ?>" data-lightbox-alt="<?= e($name) ?>" aria-label="Enlarge photo of <?= e($name) ?>">
          <img class="product-hero-photo" src="<?= e($img) ?>" alt="<?= e($name) ?>" />
        </button>
      <?php else: ?>
        <img class="product-hero-photo catalog-photo-showcase" src="<?= e(device_showcase_asset($category)) ?>" alt="" aria-hidden="true" />
      <?php endif; ?>
      <div class="image-integrity">
        <strong><?= $img ? 'Product photo' : 'Category showcase' ?></strong>
        <span>Updated <?= e($updatedLabel) ?>.</span>
      </div>
    </div>
    <div class="product-intro">
      <div class="product-badges">
        <span class="verified-chip">✓ Verified</span>
        <span><?= e($availability) ?></span>
        <span class="category-chip"><?= e(ucfirst($category)) ?></span>
      </div>
      <span class="section-kicker"><?= e($brand) ?></span>
      <h1><?= e($model !== '' ? $model : $name) ?></h1>
      <p><?= e((string) ($device['summary'] ?? '')) ?></p>
      <div class="score-price">
        <div>
          <strong><?= $score > 0 ? e(number_format($score, 1)) : '—' ?></strong>
          <span>Analysis score</span>
        </div>
        <div>
          <strong><?= !empty($device['startingPrice']) ? e('$' . number_format((float) $device['startingPrice'])) : 'Varies by region' ?></strong>
          <span>Listed price</span>
        </div>
      </div>
      <div class="product-actions">
        <a class="lime-button" href="<?= e(url('/compare?devices=' . rawurlencode((string) ($device['id'] ?? '')))) ?>">Compare this device ↗</a>
        <a class="outline-button" href="<?= e(url('/recommend?category=' . rawurlencode($category))) ?>">Find alternatives</a>
      </div>
      <?php if (!empty($device['variants']) && is_array($device['variants'])): ?>
        <div class="variant-row">
          <span>Variants</span>
          <?php foreach (array_slice($device['variants'], 0, 5) as $variant): ?>
            <b><?= e((string) $variant) ?></b>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
      <?php if (!empty($device['colors']) && is_array($device['colors'])): ?>
        <div class="variant-row">
          <span>Colors</span>
          <?php foreach (array_slice($device['colors'], 0, 6) as $color): ?>
            <b><?= e((string) $color) ?></b>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </section>

  <nav class="product-subnav" aria-label="On this page">
    <div class="shell">
      <a href="#overview">Overview</a>
      <a href="#specs">Specifications</a>
    </div>
  </nav>

  <section id="overview" class="product-overview shell">
    <div class="ai-summary">
      <div class="ai-label">
        <span>AI</span>
        <strong>Automated spec analysis</strong>
        <small>Computed from published specifications</small>
      </div>
      <h2>Who is it for?</h2>
      <p><?= e((string) ($device['summary'] ?? '')) ?></p>
      <?php if (!empty($device['bestFor']) && is_array($device['bestFor'])): ?>
        <div class="best-for">
          <?php foreach ($device['bestFor'] as $item): ?>
            <span><?= e((string) $item) ?></span>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
      <?php if ($scores !== []): ?>
        <div class="score-bars">
          <?php foreach ($scoreLabels as $key => $label): ?>
            <?php if (!isset($scores[$key])) continue; ?>
            <div class="score-bar-row">
              <span><?= e($label) ?></span>
              <div class="score-bar-track"><i style="width: <?= e((string) min(100, max(0, (float) $scores[$key] * 10))) ?>%"></i></div>
              <b><?= e(number_format((float) $scores[$key], 1)) ?></b>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
      <?php if (is_array($features) && !empty($features['chipset'])): ?>
        <small>Platform: <?= e((string) $features['chipset']) ?><?= !empty($features['os']) ? ' · ' . e((string) $features['os']) : '' ?></small>
      <?php endif; ?>
    </div>
    <div class="pros-cons">
      <div>
        <span class="pros-icon">+</span>
        <h3>Strengths</h3>
        <ul><?php foreach ($pros as $item): ?><li><?= e((string) $item) ?></li><?php endforeach; ?></ul>
      </div>
      <div>
        <span class="cons-icon">−</span>
        <h3>Tradeoffs</h3>
        <ul><?php foreach ($cons as $item): ?><li><?= e((string) $item) ?></li><?php endforeach; ?></ul>
      </div>
    </div>
  </section>

  <section id="specs" class="spec-section shell">
    <div class="spec-heading">
      <span class="section-kicker">Details</span>
      <h2>Full specifications</h2>
      <p>Key hardware and software fields for this device.</p>
    </div>
    <?php if (!empty($device['specifications'])): ?>
      <div class="spec-groups">
        <?php foreach (array_values($device['specifications']) as $index => $group): ?>
          <details <?= $index < 2 ? 'open' : '' ?>>
            <summary><span><?= e((string) ($group['name'] ?? 'Specs')) ?></span><b><?= e((string) count($group['items'] ?? [])) ?> fields</b></summary>
            <div>
              <?php foreach ($group['items'] ?? [] as $item): ?>
                <div class="spec-row">
                  <span><?= e((string) ($item['label'] ?? '')) ?></span>
                  <strong><?= e((string) ($item['value'] ?? '')) ?></strong>
                </div>
              <?php endforeach; ?>
            </div>
          </details>
        <?php endforeach; ?>
      </div>
    <?php else: ?>
      <div class="catalog-error">
        <strong>Specifications loading</strong>
        <span>A full specification table is not available for this device yet.</span>
      </div>
    <?php endif; ?>
  </section>

  <section id="reviews" class="product-reviews shell">
    <div>
      <span class="section-kicker">Three separate voices</span>
      <h2>Reviews, clearly labelled.</h2>
    </div>
    <div class="review-type-grid">
      <article>
        <span>Editorial</span>
        <h3><?= e((string) ($review['title'] ?? 'Review in progress')) ?></h3>
        <p><?= e((string) ($review['excerpt'] ?? $review['body'] ?? 'This device has not been through the Circuit Media lab write-up yet; the automated spec analysis above covers its measured strengths.')) ?></p>
        <?php if (!empty($review['url'])): ?>
          <a href="<?= e((string) $review['url']) ?>">Read the full review ↗</a>
        <?php endif; ?>
      </article>
      <article>
        <span>AI-assisted</span>
        <h3>Evidence summary</h3>
        <p>Scores and pros/cons on this page are computed deterministically from published specification fields — never invented.</p>
        <a href="<?= e(url('/ai-disclosure')) ?>">Read AI disclosure ↗</a>
      </article>
      <article>
        <span>Community</span>
        <h3><?= !empty($device['reviewUrl']) ? 'External review available' : 'No external review linked' ?></h3>
        <p><?= !empty($device['reviewUrl']) ? 'An in-depth independent review is available for this device.' : 'User submissions are sanitized and moderated before publication.' ?></p>
        <?php if (!empty($device['reviewUrl'])): ?>
          <a href="<?= e((string) $device['reviewUrl']) ?>" target="_blank" rel="noreferrer">Open external review ↗</a>
        <?php endif; ?>
      </article>
    </div>
  </section>

  <?php if ($related !== []): ?>
  <section class="content-section shell related-section">
    <div class="section-heading">
      <div>
        <span class="section-kicker">Alternatives</span>
        <h2>Also worth a look</h2>
      </div>
    </div>
    <div class="device-grid three">
      <?php foreach ($related as $item): ?>
        <?php partial('device-card', ['device' => $item]); ?>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endif; ?>

  <section class="shell content-section" id="user-review">
    <h2>Write a review</h2>
    <form id="user-review-form" data-device-id="<?= e((string) ($device['id'] ?? '')) ?>">
      <input name="author" placeholder="Your name" required />
      <input name="title" placeholder="Headline" required />
      <input name="rating" type="number" min="1" max="10" step="0.1" placeholder="Rating 1–10" required />
      <textarea name="body" rows="4" placeholder="What stood out?" required></textarea>
      <button class="primary-button" type="submit">Submit review</button>
    </form>
    <div id="user-review-status" hidden></div>
  </section>
</main>
