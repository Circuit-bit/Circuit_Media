<?php
/** @var array $result */
$result = $result ?? ['articles' => [], 'total' => 0, 'page' => 1, 'totalPages' => 1, 'hasNext' => false, 'hasPrevious' => false];
$articles = is_array($result['articles'] ?? null) ? $result['articles'] : [];
$page = max(1, (int) ($result['page'] ?? 1));
$totalPages = max(1, (int) ($result['totalPages'] ?? 1));
$total = (int) ($result['total'] ?? count($articles));
?>
<main>
  <section class="news-hero">
    <div class="shell">
      <span class="section-kicker lime">Everyday tech</span>
      <h1>News<mark>.</mark></h1>
      <p>Fresh headlines across phones, tablets, wearables, and the wider industry — updated throughout the day.</p>
      <div class="category-meta">
        <span><?= e(number_format($total)) ?> stories</span>
        <span>Auto-refreshed</span>
      </div>
    </div>
  </section>

  <section class="shell news-section">
    <div class="live-catalog-heading">
      <div>
        <span class="section-kicker">Headlines</span>
        <h2>Latest tech news</h2>
      </div>
      <div class="catalog-count">
        <strong><?= e(number_format($total)) ?></strong>
        <span>stories available</span>
      </div>
    </div>

    <?php if ($articles === []): ?>
      <div class="empty-state">
        <span aria-hidden="true">⌕</span>
        <h2>No headlines right now</h2>
        <p>Feeds are temporarily unavailable. Please try again shortly.</p>
      </div>
    <?php else: ?>
      <div class="news-grid">
        <?php foreach ($articles as $article): ?>
          <?php
            $href = url('/news/' . rawurlencode((string) ($article['slug'] ?? '')));
            $storyTitle = (string) ($article['title'] ?? 'Story');
            $outlet = (string) ($article['sourceName'] ?? 'Tech');
            $excerpt = (string) ($article['excerpt'] ?? '');
            $image = (string) ($article['image'] ?? '');
            $published = (string) ($article['publishedAt'] ?? '');
            $dateLabel = $published !== '' ? date('M j, Y', strtotime($published) ?: time()) : '';
          ?>
          <article class="news-card">
            <a class="news-card-media" href="<?= e($href) ?>" aria-label="Open <?= e($storyTitle) ?>">
              <?php if ($image !== ''): ?>
                <img src="<?= e($image) ?>" alt="" loading="lazy" width="480" height="270" />
              <?php else: ?>
                <div class="news-card-fallback" aria-hidden="true"><?= e(mb_substr($outlet, 0, 1)) ?></div>
              <?php endif; ?>
            </a>
            <div class="news-card-body">
              <div class="eyebrow-row">
                <span><?= e($outlet) ?></span>
                <?php if ($dateLabel !== ''): ?><time datetime="<?= e($published) ?>"><?= e($dateLabel) ?></time><?php endif; ?>
              </div>
              <h3><a href="<?= e($href) ?>"><?= e($storyTitle) ?></a></h3>
              <?php if ($excerpt !== ''): ?><p><?= e($excerpt) ?></p><?php endif; ?>
              <a class="text-link" href="<?= e($href) ?>">Read story <span>↗</span></a>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <?php if ($totalPages > 1): ?>
      <nav class="catalog-pagination" aria-label="News pages">
        <?php if (!empty($result['hasPrevious'])): ?>
          <a href="<?= e(url('/news?page=' . ($page - 1))) ?>">← Previous</a>
        <?php else: ?>
          <span class="is-disabled">← Previous</span>
        <?php endif; ?>
        <span>Page <strong><?= e((string) $page) ?></strong> of <?= e((string) $totalPages) ?></span>
        <?php if (!empty($result['hasNext'])): ?>
          <a href="<?= e(url('/news?page=' . ($page + 1))) ?>">Next →</a>
        <?php else: ?>
          <span class="is-disabled">Next →</span>
        <?php endif; ?>
      </nav>
    <?php endif; ?>
  </section>
</main>
