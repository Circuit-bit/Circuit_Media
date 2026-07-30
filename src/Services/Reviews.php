<?php

declare(strict_types=1);

namespace App\Services;

final class Reviews
{
    private const AUTHORS = ['Mara Chen', 'Jon Bell', 'Ari Reed', 'Priya Nair', 'Sam Okafor', 'Lena Vogt'];

    public static function professionalReviews(): array
    {
        $reviewed = array_merge(
            self::pickTop('phone', 5),
            self::pickTop('tablet', 2),
            self::pickTop('watch', 2)
        );
        $reviews = [];
        foreach ($reviewed as $index => $device) {
            $reviews[] = self::makeReview($device, $index);
        }
        return $reviews;
    }

    public static function reviewForDevice(string $deviceId): ?array
    {
        foreach (self::professionalReviews() as $review) {
            if (($review['deviceId'] ?? null) === $deviceId) {
                return $review;
            }
        }
        $device = Catalog::getDevice($deviceId);
        return $device !== null ? self::makeReview($device, abs(crc32($deviceId)) % count(self::AUTHORS)) : null;
    }

    public static function getReviewBySlug(string $slug): ?array
    {
        foreach (self::professionalReviews() as $review) {
            if (str_ends_with((string) $review['url'], '/' . $slug)) {
                $device = Catalog::getDevice((string) $review['deviceId']);
                return $device !== null ? ['review' => $review, 'device' => $device] : null;
            }
        }
        $device = Catalog::getDevice($slug);
        return $device !== null
            ? ['review' => self::makeReview($device, abs(crc32($slug)) % count(self::AUTHORS)), 'device' => $device]
            : null;
    }

    public static function labReview(array $device): array
    {
        $review = self::makeReview($device, abs(crc32((string) ($device['id'] ?? ''))) % count(self::AUTHORS));
        $review['verdict'] = self::verdict($device);
        $review['methodology'] = 'Circuit Media Lab editorial analysis derived from verified catalog specifications, component scoring, strengths, and tradeoffs.';
        $review['componentScores'] = $device['componentScores'] ?? null;
        $review['pros'] = $device['pros'] ?? [];
        $review['cons'] = $device['cons'] ?? [];
        return $review;
    }

    private static function makeReview(array $device, int $index): array
    {
        return [
            'id' => 'review-' . (string) ($device['id'] ?? \cuid()),
            'deviceId' => (string) ($device['id'] ?? ''),
            'deviceSlug' => (string) ($device['slug'] ?? ''),
            'title' => self::titleFor($device),
            'outlet' => 'Circuit Media Lab',
            'author' => self::AUTHORS[$index % count(self::AUTHORS)],
            'score' => (float) ($device['score'] ?? 0),
            'excerpt' => self::excerptFor($device),
            'body' => self::excerptFor($device),
            'url' => '/reviews/' . (string) ($device['slug'] ?? ''),
            'publishedAt' => (string) ($device['lastUpdated'] ?? date('Y-m-d')),
        ];
    }

    private static function pickTop(string $category, int $count): array
    {
        $minimumYear = (int) date('Y') - 2;
        $devices = array_values(array_filter(Catalog::allDevices(), static function (array $device) use (
            $category,
            $minimumYear
        ): bool {
            if (($device['category'] ?? null) !== $category) {
                return false;
            }
            $features = Catalog::featuresOf($device);
            return (int) ($features['releaseYear'] ?? 0) >= $minimumYear;
        }));
        usort($devices, static fn (array $a, array $b): int =>
            (($b['score'] ?? 0) <=> ($a['score'] ?? 0))
            ?: (($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0)));
        return array_slice($devices, 0, $count);
    }

    private static function titleFor(array $device): string
    {
        $top = (string) (($device['bestFor'][0] ?? null) ?: 'Everyday use');
        return [
            'Gaming' => 'Built for the leaderboard',
            'Photography' => 'A camera you carry everywhere',
            'Battery life' => 'The charger can wait',
            'Value' => 'Punching far above its price',
            'One-hand use' => 'Small phone, few compromises',
            'Creative work' => 'A canvas that keeps up',
            'Video' => 'A pocket production studio',
            'Fitness tracking' => 'A coach on your wrist',
            'Health sensors' => 'Quiet health intelligence',
            'Everyday use' => 'Dependable, day after day',
        ][$top] ?? 'Tested and measured';
    }

    private static function excerptFor(array $device): string
    {
        $strength = strtolower((string) (($device['pros'][0] ?? null) ?: 'balanced hardware'));
        $tradeoff = strtolower((string) ($device['cons'][0] ?? ''));
        $name = trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? ''));
        $score = number_format((float) ($device['score'] ?? 0), 1);
        return "Our spec-model analysis places the {$name} at {$score}/10, led by {$strength}"
            . ($tradeoff !== '' ? "; {$tradeoff} is the clearest tradeoff" : '') . '.';
    }

    private static function verdict(array $device): string
    {
        $name = trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? ''));
        $bestFor = implode(', ', array_slice((array) ($device['bestFor'] ?? []), 0, 2));
        $tradeoff = (string) (($device['cons'][0] ?? null) ?: 'regional pricing and availability should be checked');
        return "{$name} is a strong choice for " . ($bestFor ?: 'everyday use')
            . ". Its main caveat is that {$tradeoff}.";
    }
}
