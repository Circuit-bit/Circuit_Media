<?php

declare(strict_types=1);

namespace App\Services;

final class Recommend
{
    public const SCENARIOS = [
        [
            'id' => 'everyday',
            'label' => 'Everyday all-rounder',
            'description' => 'Balanced performance, battery, and camera for daily life.',
            'categories' => ['phone', 'tablet'],
            'weights' => ['performance' => 0.2, 'display' => 0.15, 'camera' => 0.2, 'battery' => 0.2, 'value' => 0.15, 'recency' => 0.1],
        ],
        [
            'id' => 'gaming',
            'label' => 'Mobile gaming',
            'description' => 'Sustained performance, high refresh-rate display, and battery to match.',
            'categories' => ['phone', 'tablet'],
            'weights' => ['performance' => 0.4, 'display' => 0.25, 'battery' => 0.15, 'charging' => 0.1, 'recency' => 0.1],
        ],
        [
            'id' => 'photography',
            'label' => 'Photography',
            'description' => 'Camera hardware first: sensors, stabilization, and optical zoom.',
            'categories' => ['phone'],
            'weights' => ['camera' => 0.4, 'zoom' => 0.15, 'display' => 0.15, 'performance' => 0.15, 'battery' => 0.1, 'recency' => 0.05],
        ],
        [
            'id' => 'video',
            'label' => 'Video & content creation',
            'description' => 'High-resolution stabilized video with the power to edit on device.',
            'categories' => ['phone', 'tablet'],
            'weights' => ['camera' => 0.3, 'performance' => 0.25, 'display' => 0.2, 'battery' => 0.15, 'recency' => 0.1],
        ],
        [
            'id' => 'battery',
            'label' => 'Marathon battery',
            'description' => 'Days of use and fast top-ups, everything else second.',
            'categories' => ['phone', 'tablet', 'watch'],
            'weights' => ['battery' => 0.5, 'charging' => 0.2, 'performance' => 0.1, 'display' => 0.1, 'value' => 0.1],
        ],
        [
            'id' => 'value',
            'label' => 'Best value on a budget',
            'description' => 'The most capability per dollar.',
            'categories' => ['phone', 'tablet', 'watch'],
            'weights' => ['value' => 0.45, 'battery' => 0.15, 'performance' => 0.15, 'display' => 0.1, 'camera' => 0.1, 'recency' => 0.05],
        ],
        [
            'id' => 'compact',
            'label' => 'Compact & light',
            'description' => 'Easy one-hand use without giving up too much.',
            'categories' => ['phone'],
            'weights' => ['portability' => 0.4, 'display' => 0.15, 'camera' => 0.15, 'performance' => 0.15, 'battery' => 0.15],
        ],
        [
            'id' => 'business',
            'label' => 'Business & productivity',
            'description' => 'Reliability, security features, endurance, and multitasking.',
            'categories' => ['phone', 'tablet'],
            'weights' => ['performance' => 0.25, 'battery' => 0.2, 'productivity' => 0.2, 'durability' => 0.15, 'display' => 0.1, 'recency' => 0.1],
        ],
        [
            'id' => 'media',
            'label' => 'Media & streaming',
            'description' => 'The best screen and speakers for movies and reading.',
            'categories' => ['phone', 'tablet'],
            'weights' => ['display' => 0.4, 'battery' => 0.25, 'portability' => 0.1, 'value' => 0.15, 'performance' => 0.1],
        ],
        [
            'id' => 'fitness',
            'label' => 'Fitness & outdoors',
            'description' => 'GPS, health sensors, water resistance, and multi-day endurance.',
            'categories' => ['watch'],
            'weights' => ['fitness' => 0.35, 'battery' => 0.3, 'durability' => 0.25, 'display' => 0.1],
        ],
        [
            'id' => 'rugged',
            'label' => 'Durability first',
            'description' => 'Water resistance and a build that survives drops and job sites.',
            'categories' => ['phone', 'watch'],
            'weights' => ['durability' => 0.4, 'battery' => 0.25, 'value' => 0.15, 'performance' => 0.1, 'display' => 0.1],
        ],
    ];

    public const MUST_HAVES = [
        ['id' => '5g', 'label' => '5G', 'categories' => ['phone', 'tablet']],
        ['id' => 'nfc', 'label' => 'NFC payments', 'categories' => ['phone', 'watch']],
        ['id' => 'water', 'label' => 'Water resistant', 'categories' => ['phone', 'tablet', 'watch']],
        ['id' => 'wireless', 'label' => 'Wireless charging', 'categories' => ['phone', 'watch']],
        ['id' => 'telephoto', 'label' => 'Telephoto zoom', 'categories' => ['phone']],
        ['id' => 'sdcard', 'label' => 'Expandable storage', 'categories' => ['phone', 'tablet']],
        ['id' => 'jack', 'label' => 'Headphone jack', 'categories' => ['phone', 'tablet']],
        ['id' => 'esim', 'label' => 'eSIM', 'categories' => ['phone', 'watch']],
    ];

    public static function recommend(array $query): array
    {
        $scenario = self::SCENARIOS[0];
        foreach (self::SCENARIOS as $candidate) {
            if ($candidate['id'] === ($query['scenario'] ?? null)) {
                $scenario = $candidate;
                break;
            }
        }

        $limit = min(max((int) ($query['limit'] ?? 8), 1), 24);
        $currentYear = (int) date('Y');
        $wantedBrands = array_values(array_filter(array_map(
            static fn (mixed $brand): string => strtolower((string) $brand),
            is_array($query['brands'] ?? null) ? $query['brands'] : []
        )));
        $mustHave = is_array($query['mustHave'] ?? null) ? $query['mustHave'] : [];
        $devices = Catalog::allDevices();

        $pool = array_values(array_filter($devices, static function (array $device) use (
            $query,
            $scenario,
            $wantedBrands,
            $mustHave,
            $currentYear
        ): bool {
            $category = $query['category'] ?? null;
            if ($category && $category !== 'all' && ($device['category'] ?? null) !== $category) {
                return false;
            }
            if (!$category || $category === 'all') {
                if (!in_array($device['category'] ?? null, $scenario['categories'], true)) {
                    return false;
                }
            }
            if ($wantedBrands !== [] && !in_array(strtolower((string) ($device['brand'] ?? '')), $wantedBrands, true)) {
                return false;
            }
            $features = Catalog::featuresOf($device);
            if ($features === null) {
                return false;
            }
            $budgetMax = $query['budgetMax'] ?? null;
            if (is_numeric($budgetMax) && (float) $budgetMax > 0) {
                if (($device['startingPrice'] ?? null) === null || $device['startingPrice'] > (float) $budgetMax) {
                    return false;
                }
            }
            if (empty($query['includeOlder'])
                && $features['releaseYear']
                && $currentYear - $features['releaseYear'] > 3) {
                return false;
            }
            if (preg_match('/cancelled/i', (string) $features['status'])) {
                return false;
            }
            foreach ($mustHave as $requirement) {
                if (!self::passesMustHave($features, (string) $requirement)) {
                    return false;
                }
            }
            return true;
        }));

        $ranked = [];
        foreach ($pool as $device) {
            $features = Catalog::featuresOf($device);
            if ($features === null) {
                continue;
            }
            $values = self::criterionValues($device, $features);
            $total = 0.0;
            $breakdown = [];
            foreach ($scenario['weights'] as $criterion => $weight) {
                $score = $values[$criterion];
                $total += $score * $weight;
                $breakdown[] = [
                    'criterion' => $criterion,
                    'weight' => $weight,
                    'score' => round($score * 100) / 100,
                ];
            }
            $reasonEntries = $breakdown;
            usort($reasonEntries, static fn (array $a, array $b): int =>
                ($b['weight'] * $b['score']) <=> ($a['weight'] * $a['score'])
            );
            $reasons = [];
            foreach ($reasonEntries as $entry) {
                $text = self::fact($entry['criterion'], $device, $features);
                if ($text !== null && $text !== '') {
                    $reasons[] = $text;
                }
                if (count($reasons) === 3) {
                    break;
                }
            }
            $ranked[] = [
                'device' => $device,
                'score' => round($total * 1000) / 10,
                'reasons' => $reasons,
                'breakdown' => $breakdown,
            ];
        }
        usort($ranked, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return [
            'scenario' => $scenario,
            'total' => count($devices),
            'considered' => count($pool),
            'recommendations' => array_slice($ranked, 0, $limit),
        ];
    }

    private static function passesMustHave(array $features, string $mustHave): bool
    {
        return match ($mustHave) {
            '5g' => (bool) $features['has5g'],
            'nfc' => (bool) $features['hasNfc'],
            'jack' => (bool) $features['hasJack'],
            'water' => (bool) $features['waterResistant'],
            'wireless' => (bool) $features['wirelessCharging'],
            'sdcard' => (bool) $features['cardSlot'],
            'telephoto' => (bool) $features['hasTelephoto'],
            'esim' => (bool) $features['hasEsim'],
            default => false,
        };
    }

    private static function criterionValues(array $device, array $features): array
    {
        $scores = is_array($device['componentScores'] ?? null)
            ? $device['componentScores']
            : ['performance' => 4, 'display' => 4, 'camera' => 4, 'battery' => 4, 'build' => 4];
        $isWatch = ($device['category'] ?? null) === 'watch';
        $startingPrice = $device['startingPrice'] ?? null;
        $value = $startingPrice
            ? self::clamp01((($device['score'] ?? 0) / max(120, $startingPrice)) / 0.02)
            : 0.25;
        $sensors = (string) ($features['sensors'] ?? '');

        return [
            'performance' => $scores['performance'] / 10,
            'display' => $scores['display'] / 10,
            'camera' => $scores['camera'] / 10,
            'zoom' => $features['hasPeriscope'] ? 1.0 : ($features['hasTelephoto'] ? 0.7 : 0.1),
            'battery' => $scores['battery'] / 10,
            'charging' => self::scale($features['chargeWatts'], 10, 120),
            'portability' => $isWatch ? 0.7
                : self::clamp01(1 - self::scale($features['weightGrams'], 150, 260, 0.5)) * 0.6
                    + self::clamp01(1 - self::scale($features['displayInches'], 5.8, 7, 0.5)) * 0.4,
            'durability' => ($features['waterResistant'] ? 0.5 : ($features['ipRating'] ? 0.3 : 0))
                + ($features['premiumBuild'] ? 0.3 : 0.1) + 0.15,
            'value' => $value,
            'recency' => $features['releaseYear']
                ? self::clamp01(1 - ((int) date('Y') - $features['releaseYear']) / 4)
                : 0.2,
            'fitness' => ($features['hasGps'] ? 0.45 : 0)
                + ($sensors !== '' ? min(0.35, count(explode(',', $sensors)) * 0.07) : 0)
                + ($features['waterResistant'] ? 0.2 : 0),
            'productivity' => ($features['stylusSupport'] ? 0.3 : 0)
                + ($features['hasEsim'] ? 0.15 : 0)
                + ($features['hasNfc'] ? 0.15 : 0)
                + self::scale($features['maxRamGb'], 4, 16) * 0.4,
        ];
    }

    private static function fact(string $criterion, array $device, array $features): ?string
    {
        return match ($criterion) {
            'performance' => $features['chipset']
                ? trim(explode('(', $features['chipset'])[0])
                    . ($features['maxRamGb'] ? " with up to {$features['maxRamGb']}GB RAM" : '')
                : null,
            'display' => $features['displayInches']
                ? "{$features['displayInches']}″ " . ($features['isOled'] ? 'OLED' : $features['displayPanel'])
                    . ($features['refreshHz'] && $features['refreshHz'] > 60 ? " at {$features['refreshHz']}Hz" : '')
                    . ($features['brightnessNits'] ? ", {$features['brightnessNits']} nits peak" : '')
                : null,
            'camera' => $features['mainCameraMp']
                ? "{$features['mainCameraMp']}MP "
                    . ($features['lensCount'] > 1 ? "{$features['lensCount']}-lens " : '')
                    . 'camera' . ($features['hasOis'] ? ' with OIS' : '')
                    . ($features['maxVideo'] ? ", {$features['maxVideo']} video" : '')
                : null,
            'zoom' => $features['hasPeriscope']
                ? 'Periscope telephoto for long-range zoom'
                : ($features['hasTelephoto'] ? 'Dedicated telephoto lens' : null),
            'battery' => $features['batteryMah']
                ? number_format($features['batteryMah']) . ' mAh battery'
                : null,
            'charging' => $features['chargeWatts']
                ? "{$features['chargeWatts']}W charging" . ($features['wirelessCharging'] ? ' plus wireless' : '')
                : null,
            'portability' => $features['weightGrams']
                ? "{$features['weightGrams']}g" . ($features['thicknessMm'] ? ", {$features['thicknessMm']}mm thin" : '')
                : null,
            'durability' => $features['ipRating']
                ? "{$features['ipRating']} rated" . ($features['premiumBuild'] ? ', premium materials' : '')
                : ($features['premiumBuild'] ? 'Premium build materials' : null),
            'value' => ($device['startingPrice'] ?? null)
                ? 'Scores ' . number_format((float) $device['score'], 1) . '/10 at $'
                    . number_format((float) $device['startingPrice'])
                : null,
            'recency' => $features['releaseYear'] ? "Released {$features['releaseYear']}" : null,
            'fitness' => $features['hasGps']
                ? 'Built-in GPS' . ($features['waterResistant'] ? " and {$features['ipRating']}" : '')
                : null,
            'productivity' => $features['stylusSupport']
                ? 'Stylus support for notes and markup'
                : ($features['maxRamGb'] ? "{$features['maxRamGb']}GB RAM for multitasking" : null),
            default => null,
        };
    }

    private static function clamp01(float $value): float
    {
        return max(0.0, min(1.0, $value));
    }

    private static function scale(float|int|null $value, float $min, float $max, float $missing = 0.3): float
    {
        return $value === null ? $missing : self::clamp01(($value - $min) / ($max - $min));
    }
}
