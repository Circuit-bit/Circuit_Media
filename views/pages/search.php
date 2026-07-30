<main class="shell content-section">
  <div class="section-heading">
    <span class="section-kicker">Search</span>
    <h1>Find a device</h1>
  </div>
  <form class="search-box" method="get" action="<?= e(url('/search')) ?>">
    <input type="search" name="q" value="<?= e($q ?? '') ?>" placeholder="e.g. Galaxy S24, iPad, Pixel Watch" autofocus />
    <select name="category">
      <?php foreach (['all' => 'All', 'phone' => 'Phones', 'tablet' => 'Tablets', 'watch' => 'Watches'] as $key => $label): ?>
        <option value="<?= e($key) ?>" <?= ($category ?? 'all') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
      <?php endforeach; ?>
    </select>
    <button class="primary-button" type="submit">Search</button>
  </form>
  <?php if (($q ?? '') !== ''): ?>
    <p><?= e(number_format((int) ($result['total'] ?? 0))) ?> results</p>
    <div class="device-grid four">
      <?php foreach ($result['devices'] ?? [] as $device): ?>
        <?php partial('device-card', ['device' => $device]); ?>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</main>
