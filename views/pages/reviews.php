<main class="shell content-section">
  <div class="section-heading">
    <span class="section-kicker">Lab</span>
    <h1>Reviews</h1>
  </div>
  <div class="review-grid">
    <?php foreach ($reviews ?? [] as $review): ?>
      <a class="review-card" href="<?= e(url('/reviews/' . rawurlencode((string) ($review['deviceSlug'] ?? $review['deviceId'] ?? '')))) ?>">
        <strong><?= e($review['title'] ?? 'Review') ?></strong>
        <p><?= e($review['excerpt'] ?? '') ?></p>
        <?php if (isset($review['score'])): ?><span class="device-score"><?= e(number_format((float) $review['score'], 1)) ?></span><?php endif; ?>
      </a>
    <?php endforeach; ?>
  </div>
</main>
