<?php
/** @var array $options */
/** @var array $initialDevices */
$options = $options ?? [];
$initialDevices = $initialDevices ?? [];
$bootstrap = [
    'options' => array_values($options),
    'initialDevices' => array_values($initialDevices),
];
$bootstrapJson = json_encode($bootstrap, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$bootstrapJson = str_replace(['</', '<!--'], ['<\/', '<\!--'], (string) $bootstrapJson);
?>
<main>
  <section class="compare-page-hero">
    <div class="shell">
      <span class="section-kicker lime">Explainable comparison</span>
      <h1>Difference,<br /><mark>decoded.</mark></h1>
      <p>Compare two to four devices, select your priorities, and inspect every specification field.</p>
    </div>
  </section>

  <section class="shell compare-workspace">
    <div id="compare-app" data-cm-compare>
      <script type="application/json" id="compare-bootstrap"><?= $bootstrapJson ?></script>

      <div class="priority-bar">
        <span>What matters most?</span>
        <div id="compare-priorities" role="group" aria-label="Priority">
          <button type="button" data-priority="camera" data-label="Camera" class="active">Camera</button>
          <button type="button" data-priority="battery" data-label="Battery">Battery</button>
          <button type="button" data-priority="performance" data-label="Gaming">Gaming</button>
          <button type="button" data-priority="display" data-label="Display">Display</button>
          <button type="button" data-priority="build" data-label="Durability">Durability</button>
          <button type="button" data-priority="value" data-label="Value">Value</button>
        </div>
        <button type="button" class="ghost-button" id="compare-share">Copy shareable view ↗</button>
      </div>

      <div id="compare-table" class="compare-table" style="--compare-count:2" aria-live="polite"></div>
      <p class="recommend-error" id="compare-error" hidden role="alert"></p>
    </div>
  </section>
</main>
