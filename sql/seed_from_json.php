<?php

declare(strict_types=1);

/**
 * Seed MySQL from the reference devices.json catalog.
 * Usage (CLI): php sql/seed_from_json.php
 */

$root = dirname(__DIR__);
require_once $root . '/src/bootstrap.php';

use App\Database;
use App\Services\Catalog;
use App\Services\Specs;

$jsonPath = $root . '/_reference_next/lib/seed/data/devices.json';
if (!is_file($jsonPath)) {
    $jsonPath = $root . '/data/devices.json';
}
if (!is_file($jsonPath)) {
    fwrite(STDERR, "devices.json not found\n");
    exit(1);
}

echo "Loading {$jsonPath}...\n";
$payload = json_decode((string) file_get_contents($jsonPath), true);
if (!is_array($payload) || !isset($payload['devices']) || !is_array($payload['devices'])) {
    fwrite(STDERR, "Invalid devices.json\n");
    exit(1);
}

try {
    $pdo = Database::pdo();
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    fwrite(STDERR, "Import schema first: mysql -u root < sql/schema.sql\n");
    exit(1);
}

$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
$pdo->exec('DELETE FROM comparison_items');
$pdo->exec('DELETE FROM comparisons');
$pdo->exec('DELETE FROM editorial_contents');
$pdo->exec('DELETE FROM ai_contents');
$pdo->exec('DELETE FROM verification_records');
$pdo->exec('DELETE FROM benchmarks');
$pdo->exec('DELETE FROM user_reviews');
$pdo->exec('DELETE FROM professional_reviews');
$pdo->exec('DELETE FROM price_offers');
$pdo->exec('DELETE FROM product_images');
$pdo->exec('DELETE FROM specifications');
$pdo->exec('DELETE FROM device_variants');
$pdo->exec('DELETE FROM devices');
$pdo->exec('DELETE FROM brands');
$pdo->exec('DELETE FROM data_sources');
$pdo->exec('SET FOREIGN_KEY_CHECKS=1');

$sourceId = 'src_catalog';
$pdo->prepare('INSERT INTO data_sources (id, provider, url, license) VALUES (?, ?, ?, ?)')
    ->execute([$sourceId, 'Circuit Media catalog', 'local://devices.json', 'Catalog record']);

$brandStmt = $pdo->prepare('INSERT INTO brands (id, name, slug, device_count) VALUES (?, ?, ?, 0)
  ON DUPLICATE KEY UPDATE name = VALUES(name)');
$deviceStmt = $pdo->prepare(
    'INSERT INTO devices (
      id, brand_id, category_id, slug, source_slug, model_name, model_number,
      announcement_date, release_date, availability_status, starting_price, currency,
      official_product_url, verification_status, score, popularity, summary, image_url, accent,
      best_for_json, pros_json, cons_json, component_scores_json, features_json, device_json, raw_provider_payload
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    )'
);

$brands = [];
$inserted = 0;
$skipped = 0;

foreach ($payload['devices'] as $seed) {
    if (!is_array($seed)) {
        $skipped++;
        continue;
    }
    $specs = $seed['specifications'] ?? null;
    if (!is_array($specs) || count($specs) < 3) {
        $skipped++;
        continue;
    }

    $device = Catalog::toDevice($seed);
    $features = Specs::extractFeatures($seed);
    $brandName = (string) $device['brand'];
    $brandSlug = slugify($brandName);
    if (!isset($brands[$brandSlug])) {
        $brandId = 'b_' . substr(md5($brandSlug), 0, 12);
        $brandStmt->execute([$brandId, $brandName, $brandSlug]);
        $brands[$brandSlug] = $brandId;
    }
    $brandId = $brands[$brandSlug];
    $categoryId = match ($device['category']) {
        'tablet' => 'cat_tablet',
        'watch' => 'cat_watch',
        default => 'cat_phone',
    };

    $announcement = normalizeDate($device['announcementDate'] ?? null);
    $release = normalizeDate($device['releaseDate'] ?? null);

    try {
    $deviceStmt->execute([
        $device['id'],
        $brandId,
        $categoryId,
        $device['slug'],
        $device['sourceSlug'] ?? $seed['slug'] ?? null,
        mb_substr((string) $device['model'], 0, 250),
        mb_substr((string) ($device['modelNumber'] ?? ''), 0, 500) ?: null,
        $announcement,
        $release,
        $device['availability'] ?? null,
        $device['startingPrice'],
        $device['currency'] ?? 'USD',
        $device['officialUrl'] ?? null,
        strtoupper((string) ($device['verification'] ?? 'unverified')),
        $device['score'] ?? null,
        (int) ($device['popularity'] ?? 0),
        $device['summary'] ?? null,
        $device['image']['url'] ?? null,
        $device['accent'] ?? null,
        json_encode($device['bestFor'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($device['pros'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($device['cons'] ?? [], JSON_UNESCAPED_UNICODE),
        json_encode($device['componentScores'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
        json_encode($features, JSON_UNESCAPED_UNICODE),
        json_encode($device, JSON_UNESCAPED_UNICODE),
        json_encode($seed, JSON_UNESCAPED_UNICODE),
    ]);
    $inserted++;
    if ($inserted % 50 === 0) {
        echo "  inserted {$inserted}...\n";
    }
    } catch (Throwable $e) {
        $skipped++;
        fwrite(STDERR, "skip {$device['id']}: {$e->getMessage()}\n");
    }
}

foreach ($brands as $slug => $id) {
    $pdo->prepare('UPDATE brands SET device_count = (SELECT COUNT(*) FROM devices WHERE brand_id = ?) WHERE id = ?')
        ->execute([$id, $id]);
}

echo "Done. Inserted {$inserted} devices, skipped {$skipped}. Brands: " . count($brands) . "\n";

function normalizeDate(mixed $value): ?string
{
    if (!is_string($value) || $value === '') {
        return null;
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) {
        return substr($value, 0, 10);
    }
    return null;
}
