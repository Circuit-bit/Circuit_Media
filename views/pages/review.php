<main class="shell content-section">
  <div class="section-heading">
    <span class="section-kicker">Lab review</span>
    <h1><?= e($review['title'] ?? (($device['brand'] ?? '') . ' ' . ($device['model'] ?? ''))) ?></h1>
  </div>
  <p class="lede"><?= e($review['excerpt'] ?? '') ?></p>
  <div class="two-col">
    <div>
      <h2>Verdict</h2>
      <p><?= e($review['body'] ?? $review['verdict'] ?? '') ?></p>
    </div>
    <div>
      <h2>Scores</h2>
      <p><strong><?= e(number_format((float) ($review['score'] ?? $device['score'] ?? 0), 1)) ?>/10</strong></p>
      <a class="primary-button" href="<?= e(device_path($device)) ?>">Full specifications</a>
    </div>
  </div>
</main>
