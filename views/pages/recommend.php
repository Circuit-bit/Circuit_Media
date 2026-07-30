<?php
/** @var array $scenarios */
/** @var array $mustHaves */
/** @var array $brands */
/** @var int $totalDevices */
/** @var int $cachedDevices */
$scenarios = $scenarios ?? [];
$mustHaves = $mustHaves ?? [];
$brands = $brands ?? [];
$totalDevices = (int) ($totalDevices ?? 0);
$cachedDevices = (int) ($cachedDevices ?? 0);
$initialCategory = (string) ($_GET['category'] ?? 'all');
if (!in_array($initialCategory, ['all', 'phone', 'tablet', 'watch'], true)) {
    $initialCategory = 'all';
}
?>
<main>
  <section class="recommend-hero">
    <div class="shell">
      <span class="section-kicker lime">Decision engine</span>
      <h1>Your use case.<br /><mark>Our shortlist.</mark></h1>
      <p>
        Answer three questions and get ranked recommendations scored from live specifications across
        <?= e(number_format($totalDevices)) ?> live devices — with the exact evidence and weights behind every pick.
        Deep scoring currently analyzes <?= e(number_format($cachedDevices)) ?> fully cached records and expands as you browse.
      </p>
    </div>
  </section>

  <section class="shell recommend-workspace">
    <div class="recommend-wizard">
      <form id="recommend-form" class="recommend-panel" data-cm-recommend>
        <div class="recommend-step">
          <span class="recommend-step-number">1</span>
          <div>
            <h2>What are you shopping for?</h2>
            <div class="chip-row" role="group" aria-label="Category">
              <?php foreach (['all' => 'Anything', 'phone' => 'Smartphone', 'tablet' => 'Tablet', 'watch' => 'Smartwatch'] as $value => $label): ?>
                <label class="chip<?= $initialCategory === $value ? ' active' : '' ?>">
                  <input type="radio" name="category" value="<?= e($value) ?>" <?= $initialCategory === $value ? 'checked' : '' ?> />
                  <?= e($label) ?>
                </label>
              <?php endforeach; ?>
            </div>
          </div>
        </div>

        <div class="recommend-step">
          <span class="recommend-step-number">2</span>
          <div>
            <h2>How will you use it?</h2>
            <div class="scenario-grid">
              <?php foreach ($scenarios as $scenario): ?>
                <label class="scenario-card">
                  <input
                    type="radio"
                    name="scenario"
                    value="<?= e($scenario['id']) ?>"
                    data-categories="<?= e(implode(',', $scenario['categories'] ?? [])) ?>"
                    data-label="<?= e($scenario['label']) ?>"
                  />
                  <strong><?= e($scenario['label']) ?></strong>
                  <span><?= e($scenario['description']) ?></span>
                </label>
              <?php endforeach; ?>
            </div>
          </div>
        </div>

        <div class="recommend-step">
          <span class="recommend-step-number">3</span>
          <div>
            <h2>Set your limits</h2>
            <div class="recommend-controls">
              <label>Budget
                <select name="budgetMax">
                  <option value="">Any budget</option>
                  <option value="200">Under $200</option>
                  <option value="350">Under $350</option>
                  <option value="500">Under $500</option>
                  <option value="750">Under $750</option>
                  <option value="1000">Under $1,000</option>
                  <option value="1500">Under $1,500</option>
                </select>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" name="includeOlder" />
                Include devices older than 3 years
              </label>
            </div>

            <h3>Must-have features <small>(optional)</small></h3>
            <div class="chip-row wrap">
              <?php foreach ($mustHaves as $item): ?>
                <label class="chip" data-must-categories="<?= e(implode(',', $item['categories'] ?? [])) ?>">
                  <input type="checkbox" name="mustHave" value="<?= e($item['id']) ?>" />
                  <?= e($item['label']) ?>
                </label>
              <?php endforeach; ?>
            </div>

            <?php if ($brands !== []): ?>
              <h3>Preferred brands <small>(optional — empty means all)</small></h3>
              <div class="chip-row wrap brand-chip-row">
                <?php foreach ($brands as $brand): ?>
                  <label class="chip">
                    <input type="checkbox" name="brands" value="<?= e($brand) ?>" />
                    <?= e($brand) ?>
                  </label>
                <?php endforeach; ?>
              </div>
            <?php endif; ?>
          </div>
        </div>

        <div class="recommend-submit">
          <button class="lime-button" type="submit" id="recommend-submit" disabled>Pick a use case first</button>
          <p class="recommend-error" id="recommend-error" hidden role="alert"></p>
        </div>
      </form>

      <div id="recommend-results" class="recommend-results" hidden></div>
    </div>
  </section>
</main>
