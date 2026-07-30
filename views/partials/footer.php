<?php $site = app_config('site'); ?>
<footer class="site-footer">
  <div class="footer-brand">
    <a class="brand brand-logo" href="<?= e(url('/')) ?>" aria-label="Circuit Media home">
      <img src="<?= e(asset('assets/img/circuit-media-logo.png')) ?>" alt="Circuit Media" class="brand-logo-img footer-logo-img" width="72" height="72" />
    </a>
    <p><?= e($site['description']) ?></p>
    <small class="footer-tagline"><?= e($site['tagline']) ?></small>
  </div>
  <div>
    <h3>Explore</h3>
    <a href="<?= e(url('/devices')) ?>">Devices</a>
    <a href="<?= e(url('/news')) ?>">News</a>
    <a href="<?= e(url('/brands')) ?>">Brands</a>
    <a href="<?= e(url('/recommend')) ?>">Recommend</a>
    <a href="<?= e(url('/compare')) ?>">Compare</a>
  </div>
  <div>
    <h3>Trust</h3>
    <a href="<?= e(url('/methodology')) ?>">Methodology</a>
    <a href="<?= e(url('/about')) ?>">About</a>
    <a href="<?= e(url('/reviews')) ?>">Reviews</a>
    <a href="<?= e(url('/contact')) ?>">Contact</a>
  </div>
  <div>
    <h3>Legal</h3>
    <a href="<?= e(url('/privacy')) ?>">Privacy</a>
    <a href="<?= e(url('/methodology')) ?>">Methodology</a>
    <a href="<?= e(url('/about')) ?>">Editorial policy</a>
    <a href="<?= e(url('/privacy')) ?>">AI disclosure</a>
  </div>
  <div class="footer-base">
    <span>© <?= e(date('Y')) ?> Circuit Media</span>
    <span>Smartphone · Tech Review · Community</span>
    <a href="mailto:<?= e($site['contactEmail']) ?>"><?= e($site['contactEmail']) ?></a>
  </div>
</footer>
