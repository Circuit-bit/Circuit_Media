<?php
/** @var array $article */
$article = $article ?? [];
$title = (string) ($article['title'] ?? 'Story');
$outlet = (string) ($article['sourceName'] ?? 'Tech');
$excerpt = (string) ($article['excerpt'] ?? '');
$image = (string) ($article['image'] ?? '');
$external = (string) ($article['url'] ?? '#');
$published = (string) ($article['publishedAt'] ?? '');
$dateLabel = $published !== '' ? date('M j, Y', strtotime($published) ?: time()) : '';
?>
<main>
  <div class="shell">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="<?= e(url('/')) ?>">Home</a>
      <span>/</span>
      <a href="<?= e(url('/news')) ?>">News</a>
      <span>/</span>
      <strong><?= e(mb_strlen($title) > 48 ? mb_substr($title, 0, 45) . '…' : $title) ?></strong>
    </nav>
  </div>

  <article class="shell news-detail">
    <header class="news-detail-header">
      <div class="eyebrow-row">
        <span><?= e($outlet) ?></span>
        <?php if ($dateLabel !== ''): ?><time datetime="<?= e($published) ?>"><?= e($dateLabel) ?></time><?php endif; ?>
      </div>
      <h1><?= e($title) ?></h1>
      <?php if ($excerpt !== ''): ?><p class="news-detail-excerpt"><?= e($excerpt) ?></p><?php endif; ?>
      <div class="product-actions">
        <a class="lime-button" href="<?= e($external) ?>" target="_blank" rel="noopener noreferrer">Read full story ↗</a>
        <a class="outline-button" href="<?= e(url('/news')) ?>">Back to news</a>
      </div>
    </header>

    <?php if ($image !== ''): ?>
      <figure class="news-detail-media">
        <img src="<?= e($image) ?>" alt="" loading="lazy" />
      </figure>
    <?php endif; ?>

    <div class="news-detail-note">
      <p>This page summarizes a headline from <?= e($outlet) ?>. The full article lives on the publisher’s site.</p>
    </div>
  </article>
</main>
