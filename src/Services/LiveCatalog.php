<?php

declare(strict_types=1);

namespace App\Services;

use Throwable;

final class LiveCatalog
{
    public static function resolveLiveDevice(string $slugOrId): ?array
    {
        $local = Catalog::getDevice($slugOrId);
        // Prefer a fully scored local catalog record when it already has specs.
        if (is_array($local)
            && is_array($local['specifications'] ?? null)
            && count($local['specifications']) >= 3
            && Catalog::featuresOf($local) !== null) {
            return $local;
        }
        $sourceSlug = (string) ($local['sourceSlug'] ?? Catalog::guessSourceSlug($slugOrId));
        try {
            $seed = GsmArena::getGsmDevice($sourceSlug);
            $device = Catalog::toDevice($seed);
            Catalog::rememberFeatures($device, $seed);
            return $device;
        } catch (Throwable) {
            // Keep any local match (including fuzzy id) even when live lookup fails.
            return $local;
        }
    }

    public static function liveBrands(): array
    {
        try {
            $brands = GsmArena::listGsmBrands();
            return ['brands' => $brands, 'totalDevices' => GsmArena::totalGsmDeviceCount($brands)];
        } catch (Throwable) {
            $grouped = [];
            foreach (Catalog::allDevices() as $device) {
                $name = (string) ($device['brand'] ?? 'Unknown');
                $grouped[$name] = ($grouped[$name] ?? 0) + 1;
            }
            ksort($grouped, SORT_NATURAL | SORT_FLAG_CASE);
            $brands = [];
            $index = 1;
            foreach ($grouped as $name => $count) {
                $slug = \slugify($name);
                $brands[] = [
                    'name' => $name,
                    'brandId' => $index++,
                    'brandSlug' => $slug,
                    'deviceCount' => $count,
                    'detailUrl' => '/brands/' . $slug,
                ];
            }
            return ['brands' => $brands, 'totalDevices' => count(Catalog::allDevices())];
        }
    }

    public static function liveBrandPage(
        string $brand,
        int $page = 1,
        int $limit = 24,
        string $category = 'all'
    ): array {
        return self::liveList([
            'brand' => $brand,
            'page' => $page,
            'limit' => $limit,
            'category' => $category,
        ]);
    }

    public static function liveSearch(
        string $query,
        int $page = 1,
        int $limit = 24,
        string $category = 'all',
        ?string $brand = null
    ): array {
        return self::liveList([
            'query' => $query,
            'page' => $page,
            'limit' => $limit,
            'category' => $category,
            'brand' => $brand,
        ]);
    }

    public static function liveList(array $options = []): array
    {
        $page = max(1, (int) ($options['page'] ?? 1));
        $pageSize = min(48, max(1, (int) ($options['limit'] ?? 24)));
        $category = (string) ($options['category'] ?? 'all');
        $brandName = trim((string) ($options['brand'] ?? ''));
        $query = trim((string) ($options['query'] ?? ''));

        try {
            if ($query !== '') {
                $hits = GsmArena::searchGsmDevices($query);
                $hits = array_values(array_filter($hits, static function (array $item) use ($category, $brandName): bool {
                    return ($category === 'all' || ($item['category'] ?? null) === $category)
                        && ($brandName === '' || strcasecmp((string) ($item['brand'] ?? ''), $brandName) === 0);
                }));
                $liveCards = [];
                foreach ($hits as $index => $item) {
                    $item['popularity'] = max(1, 100 - $index);
                    $liveCards[] = Catalog::listItemToDevice($item);
                }
                $localCards = Search::searchDevices([
                    'query' => $query,
                    'category' => $category,
                    'brand' => $brandName,
                ]);
                $seen = [];
                foreach ($liveCards as $device) {
                    $seen[(string) ($device['sourceSlug'] ?: $device['slug'])] = true;
                }
                foreach ($localCards as $device) {
                    $key = (string) ($device['sourceSlug'] ?: $device['slug']);
                    if (!isset($seen[$key])) {
                        $seen[$key] = true;
                        $liveCards[] = $device;
                    }
                }
                $result = self::paginate($liveCards, $page, $pageSize);
                $result['devices'] = self::hydrateCardImages($result['devices']);
                $result['provider'] = 'live';
                return $result;
            }

            if ($brandName !== '') {
                $brand = GsmArena::findGsmBrand($brandName);
                if ($brand !== null) {
                    $result = GsmArena::listGsmBrandDevices((string) $brand['brandSlug'], $page);
                    $items = array_values(array_filter(
                        $result['devices'],
                        static fn (array $item): bool => $category === 'all' || ($item['category'] ?? null) === $category
                    ));
                    $devices = [];
                    foreach ($items as $index => $item) {
                        $item['popularity'] = max(1, 90 - $index);
                        $devices[] = Catalog::listItemToDevice($item);
                    }
                    $totalPages = max(1, (int) ceil((int) $brand['deviceCount'] / $result['pageSize']));
                    return [
                        'devices' => self::hydrateCardImages($devices),
                        'total' => (int) $brand['deviceCount'],
                        'page' => $page,
                        'pageSize' => (int) $result['pageSize'],
                        'totalPages' => $totalPages,
                        'hasNext' => (bool) $result['hasNext'] || $page < $totalPages,
                        'hasPrevious' => $page > 1,
                        'provider' => 'live',
                        'brand' => $brand,
                    ];
                }
            }

            $merged = self::dedupeList(array_merge(
                GsmArena::topGsmByInterest(),
                GsmArena::topGsmByFans()
            ));
            if ($category !== 'all') {
                $merged = array_values(array_filter(
                    $merged,
                    static fn (array $item): bool => ($item['category'] ?? null) === $category
                ));
            }
            $cards = [];
            $seen = [];
            foreach ($merged as $index => $item) {
                $item['popularity'] = max(1, 100 - $index);
                $cards[] = Catalog::listItemToDevice($item);
                $seen[(string) $item['slug']] = true;
            }
            foreach (Catalog::allDevices() as $device) {
                if (($category === 'all' || ($device['category'] ?? null) === $category)
                    && !isset($seen[(string) ($device['sourceSlug'] ?? '')])) {
                    $cards[] = $device;
                }
            }
            $result = self::paginate($cards, $page, $pageSize);
            $result['devices'] = self::hydrateCardImages($result['devices']);
            $result['provider'] = 'live';
            return $result;
        } catch (Throwable) {
            $result = self::paginate(Search::searchDevices([
                'query' => $query,
                'category' => $category,
                'brand' => $brandName,
            ]), $page, $pageSize);
            $result['devices'] = self::hydrateCardImages($result['devices']);
            return $result;
        }
    }

    public static function liveFeatured(): array
    {
        try {
            $brandData = self::liveBrands();
            $interest = GsmArena::topGsmByInterest();
            $fans = GsmArena::topGsmByFans();
            $popularItems = array_slice(self::dedupeList(array_merge($interest, $fans)), 0, 8);
            return [
                'popular' => self::itemsToCards($popularItems, 100),
                'latest' => self::itemsToCards(array_slice($interest, 0, 6), 95),
                'totalDevices' => $brandData['totalDevices'],
                'brandCount' => count($brandData['brands']),
            ];
        } catch (Throwable) {
            $devices = Catalog::allDevices();
            $latest = $devices;
            usort($latest, static fn (array $a, array $b): int =>
                strcmp((string) ($b['releaseDate'] ?? ''), (string) ($a['releaseDate'] ?? '')));
            return [
                'popular' => array_slice($devices, 0, 8),
                'latest' => array_slice($latest, 0, 6),
                'totalDevices' => count($devices),
                'brandCount' => count(array_unique(array_column($devices, 'brand'))),
            ];
        }
    }

    private static function paginate(array $items, int $page, int $pageSize): array
    {
        $total = count($items);
        $totalPages = max(1, (int) ceil($total / $pageSize));
        $safePage = min(max(1, $page), $totalPages);
        return [
            'devices' => array_slice($items, ($safePage - 1) * $pageSize, $pageSize),
            'total' => $total,
            'page' => $safePage,
            'pageSize' => $pageSize,
            'totalPages' => $totalPages,
            'hasNext' => $safePage < $totalPages,
            'hasPrevious' => $safePage > 1,
            'provider' => 'catalog',
        ];
    }

    private static function itemsToCards(array $items, int $startPopularity): array
    {
        $cards = [];
        foreach ($items as $index => $item) {
            $item['popularity'] = max(1, $startPopularity - $index);
            $cards[] = Catalog::listItemToDevice($item);
        }
        return self::hydrateCardImages($cards);
    }

    /**
     * Attach real GSMArena / local catalog photos to list cards when missing.
     *
     * @param list<array<string, mixed>> $devices
     * @return list<array<string, mixed>>
     */
    private static function hydrateCardImages(array $devices): array
    {
        $need = [];
        foreach ($devices as $index => $device) {
            $url = $device['image']['url'] ?? null;
            if (is_string($url) && $url !== '') {
                continue;
            }
            $lookup = (string) ($device['sourceSlug'] ?? $device['slug'] ?? $device['id'] ?? '');
            $local = $lookup !== '' ? Catalog::getDevice($lookup) : null;
            if (is_array($local) && is_string($local['image']['url'] ?? null) && $local['image']['url'] !== '') {
                $devices[$index]['image'] = $local['image'];
                if (!empty($local['photos']) && is_array($local['photos'])) {
                    $devices[$index]['photos'] = $local['photos'];
                }
                continue;
            }
            $slug = (string) ($device['sourceSlug'] ?? '');
            if ($slug !== '') {
                $need[$index] = $slug;
            }
        }

        if ($need === []) {
            return $devices;
        }

        try {
            $images = GsmArena::fetchDeviceImageUrls(array_values(array_unique(array_values($need))));
        } catch (Throwable) {
            return $devices;
        }

        foreach ($need as $index => $slug) {
            $img = $images[strtolower($slug)] ?? null;
            if (!is_string($img) || $img === '') {
                continue;
            }
            $devices[$index]['image']['url'] = $img;
            $devices[$index]['photos'] = [['color' => 'Default', 'url' => $img]];
        }

        return $devices;
    }

    private static function dedupeList(array $items): array
    {
        $seen = [];
        return array_values(array_filter($items, static function (array $item) use (&$seen): bool {
            $slug = (string) ($item['slug'] ?? '');
            if ($slug === '' || isset($seen[$slug])) {
                return false;
            }
            $seen[$slug] = true;
            return true;
        }));
    }
}
