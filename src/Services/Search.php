<?php

declare(strict_types=1);

namespace App\Services;

final class Search
{
    /** Generic fragments that must not win via one-letter fuzzy edits (iphone→phone). */
    private const FUZZY_BLOCKLIST = [
        'phone', 'smart', 'watch', 'tablet', 'pixel', 'ultra', 'pro', 'max', 'plus', 'mini',
        'lite', 'note', 'fold', 'flip', 'air', 'se', 'fe', 'neo',
    ];

    public static function searchDevices(array $filters = []): array
    {
        $query = trim((string) ($filters['query'] ?? ''));
        $tokens = array_values(array_filter(preg_split('/\s+/', self::normalize($query)) ?: []));
        $category = (string) ($filters['category'] ?? 'all');
        $brand = trim((string) ($filters['brand'] ?? ''));
        $maxPrice = isset($filters['maxPrice']) && is_numeric($filters['maxPrice'])
            ? (float) $filters['maxPrice']
            : null;

        $scored = [];
        foreach (Catalog::allDevices() as $device) {
            if ($category !== '' && $category !== 'all' && ($device['category'] ?? null) !== $category) {
                continue;
            }
            if ($brand !== '' && $brand !== 'all' && strcasecmp((string) ($device['brand'] ?? ''), $brand) !== 0) {
                continue;
            }
            $price = $device['startingPrice'] ?? null;
            if ($maxPrice !== null && (!is_numeric($price) || (float) $price > $maxPrice)) {
                continue;
            }
            if ($tokens === []) {
                $scored[] = ['device' => $device, 'relevance' => 0];
                continue;
            }

            $relevance = self::relevance($device, $tokens);
            if ($relevance > 0) {
                $scored[] = ['device' => $device, 'relevance' => $relevance];
            }
        }

        $sort = (string) ($filters['sort'] ?? 'popular');
        usort($scored, static function (array $a, array $b) use ($sort, $tokens): int {
            if ($tokens !== []) {
                $byRelevance = $b['relevance'] <=> $a['relevance'];
                if ($byRelevance !== 0) {
                    return $byRelevance;
                }
            }
            $da = $a['device'];
            $db = $b['device'];
            return match ($sort) {
                'score' => ($db['score'] ?? 0) <=> ($da['score'] ?? 0),
                'newest' => strcmp((string) ($db['releaseDate'] ?? ''), (string) ($da['releaseDate'] ?? '')),
                'price-low' => ((float) ($da['startingPrice'] ?? PHP_FLOAT_MAX))
                    <=> ((float) ($db['startingPrice'] ?? PHP_FLOAT_MAX)),
                default => ($db['popularity'] ?? 0) <=> ($da['popularity'] ?? 0),
            };
        });

        return array_map(static fn (array $row): array => $row['device'], $scored);
    }

    public static function brands(): array
    {
        $brands = array_values(array_unique(array_column(Catalog::allDevices(), 'brand')));
        natcasesort($brands);
        return array_values($brands);
    }

    /**
     * Score how well a device matches query tokens.
     * Name/slug matches dominate; summary/specs are secondary and never use fuzzy edits.
     */
    private static function relevance(array $device, array $tokens): int
    {
        $name = self::normalize(trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? '')));
        $namePacked = self::compact($name);
        $slugs = preg_replace('/-\d{3,5}$/', '', implode(' ', [
            (string) ($device['slug'] ?? ''),
            (string) ($device['sourceSlug'] ?? ''),
        ])) ?? '';
        $slugWords = self::normalize(str_replace('_', ' ', $slugs));
        $category = self::normalize((string) ($device['category'] ?? ''));
        $summary = self::normalize(implode(' ', [
            (string) ($device['summary'] ?? ''),
            implode(' ', is_array($device['bestFor'] ?? null) ? $device['bestFor'] : []),
        ]));
        $specParts = [];
        foreach (is_array($device['specifications'] ?? null) ? $device['specifications'] : [] as $group) {
            foreach (is_array($group['items'] ?? null) ? $group['items'] : [] as $item) {
                $specParts[] = (string) ($item['label'] ?? '');
                $specParts[] = (string) ($item['value'] ?? '');
            }
        }
        $specs = self::normalize(implode(' ', $specParts));

        $score = 0;
        foreach ($tokens as $token) {
            $packedToken = self::compact($token);
            if (str_contains($name, $token) || ($packedToken !== '' && str_contains($namePacked, $packedToken))) {
                $score += 100;
                if (str_starts_with($name, $token) || str_starts_with($namePacked, $packedToken)) {
                    $score += 40;
                }
                continue;
            }
            if (str_contains($slugWords, $token)) {
                $score += 80;
                continue;
            }
            if (self::fuzzyIncludes($name . ' ' . $slugWords, $token)) {
                $score += 50;
                continue;
            }
            if ($category !== '' && str_contains($category, $token)) {
                $score += 20;
                continue;
            }
            // Specs/summary: whole-token substring only (never compacted — "s26"
            // falsely matches dimensions like "260 x …").
            if (self::isDistinctiveToken($token)
                && (self::hasWord($specs, $token) || self::hasWord($summary, $token))) {
                $score += 15;
                continue;
            }
            return 0;
        }
        return $score;
    }

    private static function hasWord(string $haystack, string $needle): bool
    {
        if ($haystack === '' || $needle === '') {
            return false;
        }
        return (bool) preg_match('/(?<![a-z0-9])' . preg_quote($needle, '/') . '(?![a-z0-9])/i', $haystack);
    }

    private static function normalize(string $text): string
    {
        $text = preg_replace('/[^a-z0-9.+]+/', ' ', strtolower($text)) ?? '';
        return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
    }

    private static function compact(string $text): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower($text)) ?? '';
    }

    private static function isModelToken(string $token): bool
    {
        return (bool) preg_match('/^\d{1,4}[a-z]?$|^[a-z]\d{1,4}[a-z]?$/i', $token) || strlen($token) <= 2;
    }

    private static function isDistinctiveToken(string $token): bool
    {
        if (self::isModelToken($token)) {
            return true;
        }
        if (preg_match('/\d/', $token)) {
            return true;
        }
        // Pure words need enough length and must not be ubiquitous marketing/spec terms.
        if (strlen($token) < 5) {
            return false;
        }
        return !in_array($token, self::FUZZY_BLOCKLIST, true)
            && !in_array($token, ['display', 'battery', 'camera', 'android', 'wireless', 'charging', 'storage'], true);
    }

    private static function fuzzyIncludes(string $haystack, string $needle): bool
    {
        if (strlen($needle) < 5) {
            return false;
        }
        $packed = self::compact($haystack);
        $target = self::compact($needle);
        if (strlen($target) < 5) {
            return false;
        }
        for ($index = 0, $length = strlen($target); $index < $length; $index++) {
            $candidate = substr($target, 0, $index) . substr($target, $index + 1);
            if (strlen($candidate) < 4 || in_array($candidate, self::FUZZY_BLOCKLIST, true)) {
                continue;
            }
            if (str_contains($packed, $candidate)) {
                return true;
            }
        }
        return false;
    }
}
