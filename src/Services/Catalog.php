<?php

declare(strict_types=1);

namespace App\Services;

use App\Database;
use PDO;
use Throwable;

final class Catalog
{
    private const MONTHS = [
        'january' => '01', 'february' => '02', 'march' => '03', 'april' => '04',
        'may' => '05', 'june' => '06', 'july' => '07', 'august' => '08',
        'september' => '09', 'october' => '10', 'november' => '11', 'december' => '12',
    ];

    private const WEIGHTS = [
        'phone' => ['performance' => 0.25, 'display' => 0.2, 'camera' => 0.25, 'battery' => 0.2, 'build' => 0.1],
        'tablet' => ['performance' => 0.3, 'display' => 0.3, 'camera' => 0.1, 'battery' => 0.2, 'build' => 0.1],
        'watch' => ['performance' => 0.15, 'display' => 0.25, 'camera' => 0.0, 'battery' => 0.35, 'build' => 0.25],
    ];

    private const BRAND_WEIGHT = [
        'Apple' => 16, 'Samsung' => 15, 'Google' => 11, 'Xiaomi' => 11,
        'OnePlus' => 9, 'Oppo' => 7, 'vivo' => 7, 'Realme' => 6,
        'Motorola' => 6, 'Nothing' => 8, 'Honor' => 6, 'Huawei' => 7,
        'Sony' => 5, 'Asus' => 5,
    ];

    private const ACCENTS = [
        '#c8b5a3', '#9aaeb5', '#d9c2b8', '#30556a', '#dedbd3', '#e8e5dc',
        '#23262f', '#7c7d82', '#b6aa8e', '#a3b5c8', '#c4a3c8', '#8ea98e',
    ];

    /** @var array<string, array<string, mixed>> */
    private static array $featureMap = [];
    /** @var array<int, array<string, mixed>>|null */
    private static ?array $devices = null;

    public static function toDevice(array $seed): array
    {
        $features = Specs::extractFeatures($seed);
        $category = (string) ($seed['category'] ?? 'phone');
        if (!isset(self::WEIGHTS[$category])) {
            $category = 'phone';
        }
        $componentScores = self::computeScores($features, $category);
        ['pros' => $pros, 'cons' => $cons] = self::buildProsCons($features, $category);
        $routeSlug = self::cleanSlug((string) ($seed['slug'] ?? ''));
        $name = (string) ($seed['name'] ?? '');
        $brand = (string) ($seed['brand'] ?? '');
        $model = str_starts_with(strtolower($name), strtolower($brand))
            ? (trim(substr($name, strlen($brand))) ?: $name)
            : $name;
        $fetchedAt = (string) ($seed['fetchedAt'] ?? date('c'));

        $device = [
            'id' => $routeSlug,
            'slug' => $routeSlug,
            'sourceSlug' => (string) ($seed['slug'] ?? ''),
            'brand' => $brand,
            'model' => $model,
            'modelNumber' => $features['models'] ?: 'Not published',
            'category' => $category,
            'announcementDate' => self::toIsoDate($features['announced'], $features['releaseYear']),
            'releaseDate' => self::toIsoDate(
                (string) (($seed['releaseDate'] ?? '') ?: $features['status']),
                $features['releaseYear']
            ),
            'availability' => $features['status'] ?: 'Check retailers',
            'startingPrice' => $features['priceUsd'],
            'currency' => 'USD',
            'colors' => $features['colors'],
            'variants' => $features['variants'],
            'officialUrl' => '/' . ($category === 'tablet' ? 'tablets' : ($category === 'watch' ? 'watches' : 'phones')) . '/' . $routeSlug,
            'lastUpdated' => $fetchedAt,
            'verification' => 'verified',
            'score' => self::overallScore($componentScores, $category),
            'popularity' => self::computePopularity($features, $brand),
            'summary' => self::buildSummary($name, $category, $features),
            'bestFor' => self::buildBestFor($features, $category),
            'pros' => $pros,
            'cons' => $cons,
            'specifications' => self::toSpecGroups($seed),
            'sources' => [[
                'id' => 'catalog',
                'provider' => 'Circuit Media',
                'url' => '/' . ($category === 'tablet' ? 'tablets' : ($category === 'watch' ? 'watches' : 'phones')) . '/' . $routeSlug,
                'verifiedAt' => $fetchedAt,
                'license' => 'Catalog record',
            ]],
            'accent' => self::accentFor($brand . ($seed['slug'] ?? '')),
            'image' => [
                'url' => $seed['imageUrl'] ?? null,
                'sourceUrl' => '/' . ($category === 'tablet' ? 'tablets' : ($category === 'watch' ? 'watches' : 'phones')) . '/' . $routeSlug,
                'provider' => 'Circuit Media',
                'license' => 'Catalog media',
                'verifiedAt' => $fetchedAt,
            ],
            'photos' => is_array($seed['deviceImages'] ?? null) ? $seed['deviceImages'] : [],
            'componentScores' => $componentScores,
            'reviewUrl' => null,
        ];
        self::$featureMap[$routeSlug] = $features;
        return $device;
    }

    public static function listItemToDevice(array $item): array
    {
        $popularity = isset($item['popularity']) ? (int) $item['popularity'] : 50;
        $routeSlug = self::cleanSlug((string) ($item['slug'] ?? ''));
        $name = (string) ($item['name'] ?? '');
        $brand = (string) ($item['brand'] ?? '');
        $model = str_starts_with(strtolower($name), strtolower($brand))
            ? (trim(substr($name, strlen($brand))) ?: $name)
            : $name;
        $today = date('Y-m-d');
        $imageUrl = $item['imageUrl'] ?? null;

        return [
            'id' => $routeSlug,
            'slug' => $routeSlug,
            'sourceSlug' => (string) ($item['slug'] ?? ''),
            'brand' => $brand,
            'model' => $model,
            'modelNumber' => 'Not published',
            'category' => (string) ($item['category'] ?? 'phone'),
            'announcementDate' => '2000-01-01',
            'releaseDate' => '2000-01-01',
            'availability' => 'Check retailers',
            'startingPrice' => null,
            'currency' => 'USD',
            'colors' => [],
            'variants' => [],
            'officialUrl' => '/' . (((string) ($item['category'] ?? 'phone')) === 'tablet' ? 'tablets' : (((string) ($item['category'] ?? 'phone')) === 'watch' ? 'watches' : 'phones')) . '/' . $routeSlug,
            'lastUpdated' => $today,
            'verification' => 'unverified',
            'score' => 0,
            'popularity' => $popularity,
            'summary' => "{$brand} {$model} — open for full specifications and photos.",
            'bestFor' => [],
            'pros' => [],
            'cons' => [],
            'specifications' => [],
            'sources' => [[
                'id' => 'catalog',
                'provider' => 'Circuit Media',
                'url' => '/' . (((string) ($item['category'] ?? 'phone')) === 'tablet' ? 'tablets' : (((string) ($item['category'] ?? 'phone')) === 'watch' ? 'watches' : 'phones')) . '/' . $routeSlug,
                'verifiedAt' => $today,
                'license' => 'Catalog record',
            ]],
            'accent' => self::accentFor($brand . ($item['slug'] ?? '')),
            'image' => [
                'url' => $imageUrl ?: ($item['thumbUrl'] ?? null),
                'sourceUrl' => '/' . (((string) ($item['category'] ?? 'phone')) === 'tablet' ? 'tablets' : (((string) ($item['category'] ?? 'phone')) === 'watch' ? 'watches' : 'phones')) . '/' . $routeSlug,
                'provider' => 'Circuit Media',
                'license' => 'Catalog media',
                'verifiedAt' => $today,
            ],
            'photos' => $imageUrl ? [['color' => 'Default', 'url' => $imageUrl]] : [],
            'componentScores' => null,
            'reviewUrl' => null,
        ];
    }

    public static function getDevice(string $slugOrId): ?array
    {
        $needle = trim($slugOrId);
        if ($needle === '') {
            return null;
        }

        $devices = self::allDevices();
        foreach ($devices as $device) {
            if (($device['slug'] ?? null) === $needle
                || ($device['id'] ?? null) === $needle
                || ($device['sourceSlug'] ?? null) === $needle) {
                return $device;
            }
        }

        // Live list cards often omit tokens like "5g" (…-ultra-14320 vs …-ultra-5g-14320).
        // Resolve by trailing GSM numeric id, then closest slug shape.
        $candidates = [];
        if (preg_match('/(\d{3,5})$/', $needle, $match)) {
            $num = $match[1];
            foreach ($devices as $device) {
                foreach (['id', 'slug', 'sourceSlug'] as $key) {
                    $value = (string) ($device[$key] ?? '');
                    if ($value !== '' && preg_match('/(?:^|[-_])' . preg_quote($num, '/') . '$/', $value)) {
                        $candidates[] = $device;
                        break;
                    }
                }
            }
        }

        // Also resolve bare marketing slugs: samsung-galaxy-s26-ultra → …-5g-14320
        if ($candidates === []) {
            $normNeedle = self::normalizeIdKey($needle);
            if (strlen($normNeedle) >= 8) {
                $exact = [];
                $prefix = [];
                foreach ($devices as $device) {
                    $normDevice = self::normalizeIdKey((string) ($device['slug'] ?? $device['id'] ?? ''));
                    if ($normDevice === $normNeedle) {
                        $exact[] = $device;
                    } elseif (str_starts_with($normDevice, $normNeedle)) {
                        // Avoid iphone-17-pro matching iphone-17-pro-max via prefix.
                        $rest = substr($normDevice, strlen($normNeedle));
                        if ($rest === '' || !ctype_alpha($rest[0] ?? '')) {
                            $prefix[] = $device;
                        }
                    }
                }
                $candidates = $exact !== [] ? $exact : $prefix;
            }
        }

        if ($candidates === []) {
            return null;
        }
        if (count($candidates) === 1) {
            return $candidates[0];
        }

        $normNeedle = self::normalizeIdKey($needle);
        usort($candidates, static function (array $a, array $b) use ($normNeedle): int {
            $na = self::normalizeIdKey((string) ($a['slug'] ?? $a['id'] ?? ''));
            $nb = self::normalizeIdKey((string) ($b['slug'] ?? $b['id'] ?? ''));
            $exactA = $na === $normNeedle ? 1 : 0;
            $exactB = $nb === $normNeedle ? 1 : 0;
            $cmp = $exactB <=> $exactA;
            if ($cmp !== 0) {
                return $cmp;
            }
            $scoreA = similar_text($normNeedle, $na);
            $scoreB = similar_text($normNeedle, $nb);
            $cmp = $scoreB <=> $scoreA;
            if ($cmp !== 0) {
                return $cmp;
            }
            return (($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));
        });
        return $candidates[0];
    }

    private static function normalizeIdKey(string $value): string
    {
        $value = strtolower($value);
        $value = preg_replace('/[-_]?\d{3,5}$/', '', $value) ?? $value;
        $value = str_replace(['_', '-'], '', $value);
        return str_replace(['5g', '4g', 'lte'], '', $value);
    }

    public static function allDevices(): array
    {
        if (self::$devices !== null) {
            return self::$devices;
        }

        $fromDatabase = self::loadFromDatabase();
        self::$devices = $fromDatabase ?? self::loadFromJson();
        usort(self::$devices, static function (array $a, array $b): int {
            return (($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0))
                ?: (($b['score'] ?? 0) <=> ($a['score'] ?? 0));
        });
        return self::$devices;
    }

    public static function featuresOf(array $device): ?array
    {
        $id = (string) ($device['id'] ?? '');
        if ($id !== '' && isset(self::$featureMap[$id])) {
            return self::$featureMap[$id];
        }
        // Rebuild from stored specs when feature cache is cold (partial DB / list cards).
        $specs = $device['specifications'] ?? null;
        if (!is_array($specs) || $specs === []) {
            return null;
        }
        $seed = [
            'name' => trim((string) (($device['brand'] ?? '') . ' ' . ($device['model'] ?? ''))),
            'brand' => $device['brand'] ?? '',
            'category' => $device['category'] ?? 'phone',
            'slug' => $device['sourceSlug'] ?? $device['slug'] ?? $id,
            'specifications' => $specs,
            'detailSpec' => $device['detailSpec'] ?? null,
        ];
        $features = Specs::extractFeatures($seed);
        if ($id !== '') {
            self::$featureMap[$id] = $features;
        }
        return $features;
    }

    public static function rememberFeatures(array $device, array $seed): void
    {
        $id = (string) ($device['id'] ?? '');
        if ($id !== '') {
            self::$featureMap[$id] = Specs::extractFeatures($seed);
        }
    }

    public static function guessSourceSlug(string $slugOrId): string
    {
        $local = self::getDevice($slugOrId);
        if (is_array($local) && !empty($local['sourceSlug'])) {
            return (string) $local['sourceSlug'];
        }
        $trimmed = trim($slugOrId);
        if (str_contains($trimmed, '_') || preg_match('/-\d{3,5}$/', $trimmed)) {
            return $trimmed;
        }
        if (preg_match('/^(.*)-(\d{3,5})$/', $trimmed, $match)) {
            return str_replace('-', '_', $match[1]) . '-' . $match[2];
        }
        return str_replace('-', '_', $trimmed);
    }

    private static function loadFromDatabase(): ?array
    {
        if (!class_exists(Database::class) || !Database::available()) {
            return null;
        }
        try {
            $statement = Database::pdo()->query('SELECT device_json, features_json FROM devices');
            $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
            if ($rows === []) {
                return null;
            }
            $devices = [];
            foreach ($rows as $row) {
                $decoded = json_decode((string) ($row['device_json'] ?? ''), true);
                if (!is_array($decoded)) {
                    continue;
                }
                $device = self::looksLikeSeed($decoded) ? self::toDevice($decoded) : $decoded;
                $id = (string) ($device['id'] ?? '');
                $features = json_decode((string) ($row['features_json'] ?? ''), true);
                if ($id !== '' && is_array($features)) {
                    self::$featureMap[$id] = $features;
                } elseif ($id !== '' && is_array($device['specifications'] ?? null) && $device['specifications'] !== []) {
                    self::featuresOf($device);
                }
                $devices[] = $device;
            }
            // Incomplete seed (e.g. VARCHAR(32) id truncations) — use full JSON catalog.
            if ($devices === [] || count($devices) < 100) {
                self::$featureMap = [];
                return null;
            }
            return $devices;
        } catch (Throwable) {
            return null;
        }
    }

    private static function loadFromJson(): array
    {
        $root = dirname(__DIR__, 2);
        $paths = [
            $root . '/_reference_next/lib/seed/data/devices.json',
            $root . '/data/devices.json',
        ];
        foreach ($paths as $path) {
            if (!is_file($path) || !is_readable($path)) {
                continue;
            }
            $dataset = json_decode((string) file_get_contents($path), true);
            $seeds = is_array($dataset['devices'] ?? null) ? $dataset['devices'] : [];
            $devices = [];
            foreach ($seeds as $seed) {
                if (!is_array($seed)
                    || !is_array($seed['specifications'] ?? null)
                    || count($seed['specifications']) < 3) {
                    continue;
                }
                $devices[] = self::toDevice($seed);
            }
            return $devices;
        }
        return [];
    }

    private static function looksLikeSeed(array $value): bool
    {
        return isset($value['name'], $value['slug'])
            && is_array($value['specifications'] ?? null)
            && !isset($value['model']);
    }

    private static function toIsoDate(string $text, ?int $fallbackYear): string
    {
        if (preg_match('/(20[0-3][0-9]),?\s+([A-Za-z]+)(?:\s+(\d{1,2}))?/', $text, $match)) {
            $month = self::MONTHS[strtolower($match[2])] ?? '01';
            $day = isset($match[3]) && $match[3] !== '' ? str_pad($match[3], 2, '0', STR_PAD_LEFT) : '01';
            return "{$match[1]}-{$month}-{$day}";
        }
        return $fallbackYear !== null ? "{$fallbackYear}-01-01" : '2000-01-01';
    }

    private static function clamp01(float $value): float
    {
        return max(0.0, min(1.0, $value));
    }

    private static function scale(float|int|null $value, float $min, float $max): float
    {
        return $value === null ? 0.35 : self::clamp01(($value - $min) / ($max - $min));
    }

    private static function computeScores(array $features, string $category): array
    {
        $performance = 0.75 * ($features['chipsetScore'] / 100)
            + 0.25 * self::scale($features['maxRamGb'], 2, 16);
        $display = ($features['isOled'] ? 0.35 : 0.1)
            + 0.3 * self::scale($features['refreshHz'], 60, 144)
            + 0.2 * self::scale($features['ppi'], 220, 550)
            + 0.15 * self::scale($features['brightnessNits'], 400, 3000);
        $mpLog = $features['mainCameraMp'] ? log($features['mainCameraMp']) : null;
        $camera = 0.35 * self::scale($mpLog, log(5), log(200))
            + 0.2 * self::clamp01($features['lensCount'] / 4)
            + ($features['hasOis'] ? 0.15 : 0)
            + ($features['hasTelephoto'] ? 0.15 : 0)
            + ($features['maxVideo'] === '8K' ? 0.15 : ($features['maxVideo'] === '4K' ? 0.1 : 0));
        $batteryRange = $category === 'tablet' ? [5000, 12000]
            : ($category === 'watch' ? [200, 700] : [3000, 6500]);
        $battery = 0.6 * self::scale($features['batteryMah'], $batteryRange[0], $batteryRange[1])
            + 0.3 * self::scale($features['chargeWatts'], 5, 120)
            + ($features['wirelessCharging'] ? 0.1 : 0);
        $build = ($features['waterResistant'] ? 0.45 : ($features['ipRating'] ? 0.25 : 0))
            + ($features['premiumBuild'] ? 0.3 : 0.12)
            + (($features['hasNfc'] || $category !== 'phone') ? 0.15 : 0.05)
            + 0.1;
        $toTen = static fn (float $value): float => round(self::clamp01($value) * 100) / 10;
        return [
            'performance' => $toTen($performance),
            'display' => $toTen($display),
            'camera' => $toTen($camera),
            'battery' => $toTen($battery),
            'build' => $toTen($build),
        ];
    }

    private static function overallScore(array $scores, string $category): float
    {
        $weights = self::WEIGHTS[$category];
        $raw = $scores['performance'] * $weights['performance']
            + $scores['display'] * $weights['display']
            + $scores['camera'] * $weights['camera']
            + $scores['battery'] * $weights['battery']
            + $scores['build'] * $weights['build'];
        return round(max(4, min(9.8, 4 + ($raw - 1.5) * 0.83)) * 10) / 10;
    }

    private static function computePopularity(array $features, string $brand): int
    {
        $currentYear = (int) date('Y');
        $age = $features['releaseYear'] ? max(0, $currentYear - $features['releaseYear']) : 6;
        return max(1, min(100, (int) round(
            38 + (self::BRAND_WEIGHT[$brand] ?? 4) + max(0, 28 - $age * 7)
            + ($features['chipsetScore'] / 100) * 18
        )));
    }

    private static function buildProsCons(array $features, string $category): array
    {
        $pros = [];
        $cons = [];
        if ($features['chipsetScore'] >= 88) $pros[] = 'Flagship-class performance';
        if ($features['batteryMah'] && $category === 'phone' && $features['batteryMah'] >= 5500) $pros[] = 'Large ' . number_format($features['batteryMah']) . ' mAh battery';
        if ($features['chargeWatts'] && $features['chargeWatts'] >= 80) $pros[] = "Very fast {$features['chargeWatts']}W charging";
        if ($features['isOled'] && $features['refreshHz'] && $features['refreshHz'] >= 120) $pros[] = "Smooth {$features['refreshHz']}Hz OLED display";
        if ($features['hasPeriscope']) $pros[] = 'Periscope telephoto zoom';
        elseif ($features['hasTelephoto']) $pros[] = 'Dedicated telephoto camera';
        if ($features['hasOis'] && !$features['hasPeriscope']) $pros[] = 'Optically stabilized main camera';
        if ($features['waterResistant']) $pros[] = "{$features['ipRating']} water resistance";
        if ($features['premiumBuild']) $pros[] = 'Premium build materials';
        if ($features['cardSlot']) $pros[] = 'Expandable storage';
        if ($features['hasJack']) $pros[] = '3.5mm headphone jack';
        if ($features['stylusSupport'] && $category !== 'watch') $pros[] = 'Stylus support';

        if ($category !== 'watch' && !$features['isOled'] && $features['displayPanel'] === 'LCD') $cons[] = 'LCD rather than OLED display';
        if ($features['refreshHz'] === 60.0 && $category === 'phone') $cons[] = '60Hz display refresh rate';
        if ($features['chargeWatts'] !== null && $features['chargeWatts'] <= 25 && $category === 'phone') $cons[] = 'Modest charging speed';
        if (!$features['waterResistant'] && $category === 'phone' && !$features['ipRating']) $cons[] = 'No official water-resistance rating';
        if ($features['batteryMah'] !== null && $category === 'phone' && $features['batteryMah'] < 4200) $cons[] = 'Smaller battery than rivals';
        if (!$features['hasNfc'] && $category === 'phone') $cons[] = 'No NFC for contactless payments';
        if ($features['weightGrams'] !== null && $category === 'phone' && $features['weightGrams'] >= 225) $cons[] = "Heavy at {$features['weightGrams']}g";
        if ($features['chipsetScore'] < 50) $cons[] = 'Entry-level performance';
        if ($features['priceUsd'] === null) $cons[] = 'Pricing varies by region';
        return ['pros' => array_slice($pros, 0, 5), 'cons' => array_slice($cons, 0, 4)];
    }

    private static function buildBestFor(array $features, string $category): array
    {
        $tags = [];
        if ($category === 'watch') {
            if ($features['hasGps']) $tags[] = 'Fitness tracking';
            if ($features['batteryMah'] && $features['batteryMah'] >= 450) $tags[] = 'Battery life';
            $tags[] = 'Health sensors';
        } else {
            if ($features['chipsetScore'] >= 85 && ($features['refreshHz'] ?? 0) >= 120) $tags[] = 'Gaming';
            if (($features['mainCameraMp'] ?? 0) >= 50 && ($features['hasTelephoto'] || $features['hasOis'])) $tags[] = 'Photography';
            if (($features['batteryMah'] ?? 0) >= ($category === 'tablet' ? 8000 : 5500)) $tags[] = 'Battery life';
            if ($features['priceUsd'] !== null && $features['priceUsd'] < 400) $tags[] = 'Value';
            if ($category === 'phone' && ($features['displayInches'] ?? 7) <= 6.2) $tags[] = 'One-hand use';
            if ($category === 'tablet' && $features['stylusSupport']) $tags[] = 'Creative work';
            if ($features['maxVideo'] === '8K' || ($features['maxVideo'] === '4K' && $features['hasOis'])) $tags[] = 'Video';
        }
        if ($tags === []) $tags[] = 'Everyday use';
        return array_slice($tags, 0, 3);
    }

    private static function buildSummary(string $name, string $category, array $features): string
    {
        $parts = [];
        if ($features['displayInches']) {
            $refresh = $features['refreshHz'] && $features['refreshHz'] > 60 ? " {$features['refreshHz']}Hz" : '';
            $panel = $features['isOled'] ? 'OLED' : $features['displayPanel'];
            $parts[] = "a {$features['displayInches']}″ {$panel}{$refresh} display";
        }
        if ($features['chipset']) $parts[] = trim(explode('(', Specs::cleanHtml($features['chipset']))[0]);
        if ($features['mainCameraMp'] && $category !== 'watch') {
            $camera = $features['lensCount'] > 1 ? "{$features['lensCount']}-camera" : 'camera';
            $parts[] = "a {$features['mainCameraMp']}MP {$camera} system";
        }
        if ($features['batteryMah']) {
            $charging = $features['chargeWatts'] ? " with {$features['chargeWatts']}W charging" : '';
            $parts[] = 'a ' . number_format($features['batteryMah']) . " mAh battery{$charging}";
        }
        $year = $features['releaseYear'] ? " ({$features['releaseYear']})" : '';
        $categoryLabel = $category === 'phone' ? 'smartphone' : $category;
        return "{$name} is a " . self::tierAdjective($features) . " {$categoryLabel}{$year} pairing "
            . implode(', ', array_slice($parts, 0, 3)) . '.';
    }

    private static function tierAdjective(array $features): string
    {
        if ($features['chipsetScore'] >= 88) return 'flagship';
        if ($features['chipsetScore'] >= 70) return 'upper mid-range';
        if ($features['chipsetScore'] >= 50) return 'mid-range';
        return 'budget';
    }

    private static function toSpecGroups(array $seed): array
    {
        $groups = [];
        foreach (($seed['specifications'] ?? []) as $groupName => $entries) {
            if (!is_array($entries)) continue;
            $items = [];
            foreach ($entries as $label => $value) {
                $text = Specs::cleanHtml(is_scalar($value) ? (string) $value : null);
                if ($text !== '') {
                    $items[] = ['label' => $label ?: 'Info', 'value' => $text, 'status' => 'verified', 'sourceId' => 'catalog'];
                }
            }
            if ($items !== []) $groups[] = ['name' => $groupName, 'items' => $items];
        }
        return $groups;
    }

    private static function cleanSlug(string $slug): string
    {
        $slug = preg_replace('/[^a-z0-9]+/', '-', strtolower($slug)) ?? '';
        return trim($slug, '-');
    }

    private static function accentFor(string $text): string
    {
        $hash = 0;
        foreach (unpack('C*', $text) ?: [] as $byte) {
            $hash = (($hash * 31) + $byte) & 0xFFFFFFFF;
        }
        return self::ACCENTS[$hash % count(self::ACCENTS)];
    }
}
