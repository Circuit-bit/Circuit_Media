<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

final class GsmArena
{
    public const BRAND_PAGE_SIZE = 50;
    private const DEFAULT_BASE = 'https://mobile-specs-api-sandy.vercel.app';
    private const BRAND_ALIASES = [
        'galaxy' => 'samsung', 'pixel' => 'google', 'iphone' => 'apple', 'ipad' => 'apple',
        'rog' => 'asus', 'zenfone' => 'asus', 'find' => 'oppo', 'reno' => 'oppo',
        'redmi' => 'xiaomi', 'poco' => 'xiaomi', 'mi' => 'xiaomi', 'moto' => 'motorola',
        'iqoo' => 'vivo',
    ];

    /** @var array<string, array{expires:int,value:mixed}> */
    private static array $memoryCache = [];

    public static function listGsmBrands(): array
    {
        return self::cached('brands', 1800, static function (): array {
            $payload = self::request('/brands');
            $data = self::record($payload['data'] ?? null);
            $brands = [];
            foreach ($data as $name => $value) {
                $entry = self::record($value);
                $slug = self::text($entry['brand_slug'] ?? null);
                if ($slug === '') {
                    continue;
                }
                $brands[] = [
                    'name' => (string) $name,
                    'brandId' => (int) ($entry['brand_id'] ?? 0),
                    'brandSlug' => $slug,
                    'deviceCount' => (int) ($entry['device_count'] ?? 0),
                    'detailUrl' => self::text($entry['detail_url'] ?? null) ?: '/brands/' . $slug,
                ];
            }
            usort($brands, static fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));
            return $brands;
        });
    }

    public static function listGsmBrandDevices(string $brandSlug, int $page = 1): array
    {
        $page = max(1, $page);
        $key = 'brand:' . strtolower($brandSlug) . ':' . $page;
        return self::cached($key, 600, static function () use ($brandSlug, $page): array {
            $brand = self::findGsmBrand($brandSlug);
            $resolvedSlug = (string) ($brand['brandSlug'] ?? $brandSlug);
            $brandName = (string) ($brand['name'] ?? self::brandFromSlug($resolvedSlug));
            $payload = self::request('/brands/' . rawurlencode(self::brandPageSlug($resolvedSlug, $page)));
            $rows = is_array($payload['data'] ?? null) ? $payload['data'] : [];
            $devices = [];
            foreach ($rows as $row) {
                $item = self::normalizeListItem($row, $brandName);
                if ($item !== null) {
                    $devices[] = $item;
                }
            }
            return [
                'devices' => $devices,
                'page' => $page,
                'pageSize' => self::BRAND_PAGE_SIZE,
                'hasNext' => count($devices) >= self::BRAND_PAGE_SIZE,
            ];
        });
    }

    public static function searchGsmDevices(string $query): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }
        return self::cached('search:' . strtolower($query), 300, static function () use ($query): array {
            $tokens = self::searchTokens($query);
            $devices = self::rawSearch($query);
            if ($devices === [] && count($tokens) > 1) {
                $devices = array_values(array_filter(
                    self::rawSearch($tokens[0]),
                    static fn (array $item): bool => self::matchesTokens($item, $tokens)
                ));
            }
            if ($devices === []) {
                $match = self::matchBrand($query);
                if ($match !== null) {
                    $devices = self::searchBrandCatalog($match['brand'], $match['remainder']);
                }
            }
            return self::dedupe($devices);
        });
    }

    public static function topGsmByInterest(): array
    {
        return self::topList('/top-by-interest', 'top-interest');
    }

    public static function topGsmByFans(): array
    {
        return self::topList('/top-by-fans', 'top-fans');
    }

    public static function getGsmDevice(string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            throw new RuntimeException('Missing device slug', 400);
        }
        return self::cached('detail:' . strtolower($slug), 3600, static function () use ($slug): array {
            $device = self::normalizeGsmDetail(
                $slug,
                self::brandFromSlug($slug),
                null,
                self::request('/' . rawurlencode($slug))
            );
            if (($device['specifications'] ?? []) === []) {
                throw new RuntimeException("No specifications returned for {$slug}", 404);
            }
            return $device;
        });
    }

    /**
     * Resolve catalog thumbnail URLs for many GSMArena slugs (cache + parallel fetch).
     *
     * @param list<string> $slugs
     * @return array<string, string> lowercase slug => https image URL
     */
    public static function fetchDeviceImageUrls(array $slugs): array
    {
        $unique = [];
        foreach ($slugs as $slug) {
            $slug = strtolower(trim((string) $slug));
            if ($slug !== '') {
                $unique[$slug] = true;
            }
        }
        $wanted = array_keys($unique);
        if ($wanted === []) {
            return [];
        }

        $found = [];
        $missing = [];
        $mapFile = dirname(__DIR__, 2) . '/data/cache/image-map.json';
        $bulkMap = [];
        if (is_file($mapFile)) {
            $decodedMap = json_decode((string) file_get_contents($mapFile), true);
            if (is_array($decodedMap)) {
                $bulkMap = $decodedMap;
            }
        }
        foreach ($wanted as $slug) {
            $cached = self::readCache('image:' . $slug, 86400);
            if (is_array($cached) && is_string($cached['url'] ?? null) && $cached['url'] !== '') {
                $found[$slug] = $cached['url'];
                continue;
            }
            if (isset($bulkMap[$slug]) && is_array($bulkMap[$slug]) && is_string($bulkMap[$slug]['url'] ?? null) && $bulkMap[$slug]['url'] !== '') {
                $found[$slug] = $bulkMap[$slug]['url'];
                self::writeCache('image:' . $slug, ['url' => $found[$slug]], 86400);
                continue;
            }
            try {
                $detail = self::readCache('detail:' . $slug, 3600);
                if (is_array($detail)) {
                    $url = self::text($detail['imageUrl'] ?? null)
                        ?: self::text($detail['thumbUrl'] ?? null);
                    if ($url === '' && is_array($detail['deviceImages'][0] ?? null)) {
                        $url = self::text($detail['deviceImages'][0]['url'] ?? null);
                    }
                    if ($url !== '') {
                        $found[$slug] = $url;
                        self::writeCache('image:' . $slug, ['url' => $url], 86400);
                        continue;
                    }
                }
            } catch (\Throwable) {
                // Fall through to network fetch.
            }
            $missing[] = $slug;
        }

        if ($missing === []) {
            return $found;
        }

        @set_time_limit(90);
        $base = rtrim((string) \app_config('env.specs_api_url', self::DEFAULT_BASE), '/');
        $chunkSize = 6;
        foreach (array_chunk($missing, $chunkSize) as $chunk) {
            $multi = curl_multi_init();
            if ($multi === false) {
                break;
            }
            /** @var array<int, array{slug:string, handle:\CurlHandle}> $handles */
            $handles = [];
            foreach ($chunk as $slug) {
                $curl = curl_init($base . '/' . rawurlencode($slug));
                if ($curl === false) {
                    continue;
                }
                curl_setopt_array($curl, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_CONNECTTIMEOUT => 4,
                    CURLOPT_TIMEOUT => 10,
                    CURLOPT_HTTPHEADER => [
                        'Accept: application/json',
                        'User-Agent: CircuitMedia/2.0 (+https://circuit-media.com)',
                    ],
                ]);
                curl_multi_add_handle($multi, $curl);
                $handles[] = ['slug' => $slug, 'handle' => $curl];
            }

            $running = null;
            do {
                $status = curl_multi_exec($multi, $running);
                if ($running) {
                    curl_multi_select($multi, 1.0);
                }
            } while ($running && $status === CURLM_OK);

            foreach ($handles as $entry) {
                $slug = $entry['slug'];
                $curl = $entry['handle'];
                $body = curl_multi_getcontent($curl);
                $http = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
                curl_multi_remove_handle($multi, $curl);
                curl_close($curl);
                if (!is_string($body) || $http < 200 || $http >= 300) {
                    continue;
                }
                $payload = json_decode($body, true);
                if (!is_array($payload) || ($payload['status'] ?? true) === false) {
                    continue;
                }
                try {
                    $device = self::normalizeGsmDetail($slug, self::brandFromSlug($slug), null, $payload);
                } catch (\Throwable) {
                    continue;
                }
                $url = self::text($device['imageUrl'] ?? null) ?: self::text($device['thumbUrl'] ?? null);
                if ($url === '' && is_array($device['deviceImages'][0] ?? null)) {
                    $url = self::text($device['deviceImages'][0]['url'] ?? null);
                }
                if ($url === '') {
                    continue;
                }
                $found[$slug] = $url;
                self::writeCache('image:' . $slug, ['url' => $url], 86400);
                if (($device['specifications'] ?? []) !== []) {
                    self::writeCache('detail:' . $slug, $device, 3600);
                }
            }
            curl_multi_close($multi);
        }

        return $found;
    }

    public static function findGsmBrand(string $nameOrSlug): ?array
    {
        $needle = strtolower(trim($nameOrSlug));
        foreach (self::listGsmBrands() as $brand) {
            $name = strtolower((string) $brand['name']);
            $slug = strtolower((string) $brand['brandSlug']);
            if ($name === $needle || $slug === $needle || str_starts_with($slug, $needle . '-phones-')) {
                return $brand;
            }
        }
        return null;
    }

    public static function detectCategory(string $name, string $slug = ''): string
    {
        $haystack = strtolower($name . ' ' . $slug);
        if (preg_match('/\b(watch|band|fit\d|fit|fit2|loop)\b|smartwatch|_watch|_band|_fit/', $haystack)) {
            return 'watch';
        }
        if (preg_match('/\bipad|matepad|\btab\b|_tab_|\bpad\b|_pad|tablet|pad_\d|pad\s/', $haystack)) {
            return 'tablet';
        }
        return 'phone';
    }

    public static function brandFromSlug(string $deviceSlug): string
    {
        $first = explode('_', $deviceSlug)[0] ?: 'Unknown';
        $first = preg_replace('/-phones(?:-f)?-\d.*$/i', '', $first) ?: $first;
        return ucfirst($first);
    }

    public static function totalGsmDeviceCount(array $brands): int
    {
        return array_reduce($brands, static fn (int $sum, array $brand): int =>
            $sum + (int) ($brand['deviceCount'] ?? 0), 0);
    }

    public static function normalizeGsmDetail(
        string $slug,
        string $brandName,
        ?array $listHint,
        mixed $detail
    ): array {
        $raw = self::record($detail);
        $rawData = self::record($raw['data'] ?? null);
        $source = $rawData !== [] ? $rawData : $raw;
        $name = self::text($source['model'] ?? null)
            ?: self::text($source['name'] ?? null)
            ?: (string) ($listHint['name'] ?? $slug);
        $brand = $brandName ?: self::text($source['brand'] ?? null) ?: self::brandFromSlug($slug);
        $fullName = str_starts_with(strtolower($name), strtolower($brand)) ? $name : trim($brand . ' ' . $name);
        $images = [];
        foreach (is_array($source['device_images'] ?? null) ? $source['device_images'] : [] as $entry) {
            if (is_string($entry) && $entry !== '') {
                $images[] = ['color' => 'Default', 'url' => $entry];
                continue;
            }
            $image = self::record($entry);
            $url = self::text($image['url'] ?? null) ?: self::text($image['image_url'] ?? null);
            if ($url !== '') {
                $images[] = ['color' => self::text($image['color'] ?? null) ?: 'Default', 'url' => $url];
            }
        }
        $imageUrl = self::text($source['imageUrl'] ?? null)
            ?: self::text($source['image_url'] ?? null)
            ?: (string) ($listHint['imageUrl'] ?? '')
            ?: (string) ($images[0]['url'] ?? '');
        return [
            'slug' => $slug,
            'brand' => $brand,
            'name' => $fullName,
            'category' => self::detectCategory($fullName, $slug),
            'imageUrl' => $imageUrl !== '' ? $imageUrl : null,
            'thumbUrl' => $listHint['thumbUrl'] ?? ($imageUrl !== '' ? $imageUrl : null),
            'deviceImages' => $images,
            'reviewUrl' => self::text($source['review_url'] ?? null) ?: null,
            'releaseDate' => self::text($source['release_date'] ?? null),
            'dimensions' => self::text($source['dimensions'] ?? null),
            'os' => self::text($source['os'] ?? null),
            'storage' => self::text($source['storage'] ?? null),
            'specifications' => self::record($source['specifications'] ?? null),
            'sourceUrl' => "https://www.gsmarena.com/{$slug}.php",
            'fetchedAt' => date('Y-m-d'),
        ];
    }

    private static function request(string $path): array
    {
        $base = rtrim((string) \app_config('env.specs_api_url', self::DEFAULT_BASE), '/');
        $url = $base . '/' . ltrim($path, '/');
        $lastError = 'GSMArena request failed';
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $curl = curl_init($url);
            if ($curl === false) {
                throw new RuntimeException('Unable to initialize cURL');
            }
            curl_setopt_array($curl, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: CircuitMedia/2.0 (+https://circuit-media.com)'],
            ]);
            $body = curl_exec($curl);
            $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
            $error = curl_error($curl);
            curl_close($curl);
            if (is_string($body) && $status >= 200 && $status < 300) {
                $payload = json_decode($body, true);
                if (!is_array($payload)) {
                    throw new RuntimeException('GSMArena API returned invalid JSON', 502);
                }
                if (($payload['status'] ?? true) === false) {
                    throw new RuntimeException((string) ($payload['message'] ?? 'GSMArena API error'), 502);
                }
                return $payload;
            }
            $lastError = $error !== '' ? $error : "GSMArena API returned {$status}";
            if ($attempt < 3 && ($status === 0 || $status >= 500)) {
                usleep(400000 * $attempt);
                continue;
            }
            break;
        }
        throw new RuntimeException($lastError, 502);
    }

    private static function rawSearch(string $query): array
    {
        $payload = self::request('/search?query=' . rawurlencode($query));
        $devices = [];
        foreach (is_array($payload['data'] ?? null) ? $payload['data'] : [] as $row) {
            $item = self::normalizeListItem($row);
            if ($item !== null) {
                $devices[] = $item;
            }
        }
        return $devices;
    }

    private static function topList(string $path, string $key): array
    {
        return self::cached($key, 600, static function () use ($path): array {
            $payload = self::request($path);
            $devices = [];
            foreach (is_array($payload['data'] ?? null) ? $payload['data'] : [] as $row) {
                $item = self::normalizeListItem($row);
                if ($item !== null) {
                    $devices[] = $item;
                }
            }
            return $devices;
        });
    }

    private static function normalizeListItem(mixed $entry, string $brandHint = ''): ?array
    {
        $raw = self::record($entry);
        $slug = self::text($raw['slug'] ?? null);
        if ($slug === '') {
            return null;
        }
        $name = self::text($raw['name'] ?? null) ?: $slug;
        $image = self::text($raw['imageUrl'] ?? null) ?: self::text($raw['image_url'] ?? null);
        $thumb = self::text($raw['thumbUrl'] ?? null) ?: self::text($raw['thumb_url'] ?? null) ?: $image;
        return [
            'name' => $name,
            'slug' => $slug,
            'imageUrl' => $image !== '' ? $image : null,
            'thumbUrl' => $thumb !== '' ? $thumb : null,
            'brand' => $brandHint ?: self::brandFromSlug($slug),
            'category' => self::detectCategory($name, $slug),
        ];
    }

    private static function matchBrand(string $query): ?array
    {
        $brands = self::listGsmBrands();
        $lower = strtolower(trim($query));
        $matches = array_values(array_filter($brands, static function (array $brand) use ($lower): bool {
            $name = strtolower((string) $brand['name']);
            return $lower === $name || str_starts_with($lower, $name . ' ')
                || str_contains($lower, ' ' . $name . ' ') || str_ends_with($lower, ' ' . $name);
        }));
        usort($matches, static fn (array $a, array $b): int => strlen($b['name']) <=> strlen($a['name']));
        if ($matches !== []) {
            $brand = $matches[0];
            return ['brand' => $brand, 'remainder' => trim(preg_replace(
                '/' . preg_quote((string) $brand['name'], '/') . '/i',
                ' ',
                $query,
                1
            ) ?? '')];
        }
        $tokens = self::searchTokens($query);
        foreach ($tokens as $token) {
            $alias = self::BRAND_ALIASES[$token] ?? null;
            if ($alias === null) {
                continue;
            }
            foreach ($brands as $brand) {
                if (strtolower($brand['name']) === $alias
                    || str_starts_with(strtolower($brand['brandSlug']), $alias . '-phones-')) {
                    $remaining = array_filter($tokens, static fn (string $item): bool =>
                        $item !== $token && (self::BRAND_ALIASES[$item] ?? null) !== $alias);
                    return ['brand' => $brand, 'remainder' => implode(' ', $remaining)];
                }
            }
        }
        $first = $tokens[0] ?? '';
        if (strlen($first) < 2) {
            return null;
        }
        foreach ($brands as $brand) {
            $name = strtolower((string) $brand['name']);
            $slug = strtolower((string) $brand['brandSlug']);
            if ($name === $first || str_starts_with($slug, $first . '-phones-')
                || str_replace(' ', '', $name) === $first) {
                return ['brand' => $brand, 'remainder' => trim(preg_replace(
                    '/' . preg_quote($first, '/') . '/i',
                    ' ',
                    $query,
                    1
                ) ?? '')];
            }
        }
        return null;
    }

    private static function searchBrandCatalog(array $brand, string $remainder): array
    {
        $tokens = self::searchTokens($remainder);
        $collected = [];
        for ($page = 1; $page <= 3; $page++) {
            $result = self::listGsmBrandDevices((string) $brand['brandSlug'], $page);
            foreach ($result['devices'] as $item) {
                if ($tokens === [] || self::matchesTokens($item, $tokens)) {
                    $collected[] = $item;
                }
            }
            if (!$result['hasNext'] || $tokens === [] || count($collected) >= 24) {
                break;
            }
        }
        return $collected;
    }

    private static function searchTokens(string $query): array
    {
        $normalized = preg_replace('/[^a-z0-9.+]+/', ' ', strtolower($query)) ?? '';
        $stop = ['the', 'a', 'an', 'and', 'or', 'with', 'for'];
        return array_values(array_filter(
            preg_split('/\s+/', trim($normalized)) ?: [],
            static fn (string $token): bool => $token !== '' && !in_array($token, $stop, true)
        ));
    }

    private static function matchesTokens(array $item, array $tokens): bool
    {
        $haystack = preg_replace('/[^a-z0-9.+]+/', ' ', strtolower(
            (string) ($item['brand'] ?? '') . ' ' . (string) ($item['name'] ?? '')
        )) ?? '';
        $compact = preg_replace('/\s+/', '', $haystack) ?? '';
        foreach ($tokens as $token) {
            if (!str_contains($haystack, $token) && !str_contains($compact, str_replace(' ', '', $token))) {
                return false;
            }
        }
        return true;
    }

    private static function dedupe(array $items): array
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

    private static function brandPageSlug(string $brandSlug, int $page): string
    {
        if ($page <= 1 || !preg_match('/^(.*)-phones-(\d+)$/i', $brandSlug, $match)) {
            return $brandSlug;
        }
        return "{$match[1]}-phones-f-{$match[2]}-0-p{$page}";
    }

    private static function cacheFile(string $key): string
    {
        return dirname(__DIR__, 2) . '/data/cache/gsm-' . hash('sha256', $key) . '.json';
    }

    private static function readCache(string $key, int $ttl): mixed
    {
        $now = time();
        if (isset(self::$memoryCache[$key]) && self::$memoryCache[$key]['expires'] >= $now) {
            return self::$memoryCache[$key]['value'];
        }
        $file = self::cacheFile($key);
        if (is_file($file) && filemtime($file) !== false && filemtime($file) + $ttl >= $now) {
            $decoded = json_decode((string) file_get_contents($file), true);
            if (is_array($decoded)) {
                self::$memoryCache[$key] = ['expires' => $now + $ttl, 'value' => $decoded];
                return $decoded;
            }
        }
        return null;
    }

    private static function writeCache(string $key, mixed $value, int $ttl): void
    {
        self::$memoryCache[$key] = ['expires' => time() + $ttl, 'value' => $value];
        $directory = dirname(__DIR__, 2) . '/data/cache';
        if (!is_dir($directory)) {
            @mkdir($directory, 0775, true);
        }
        if (is_dir($directory) && is_writable($directory)) {
            @file_put_contents(self::cacheFile($key), json_encode($value, JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        if (count(self::$memoryCache) > 500) {
            array_shift(self::$memoryCache);
        }
    }

    private static function cached(string $key, int $ttl, callable $loader): mixed
    {
        $cached = self::readCache($key, $ttl);
        if ($cached !== null) {
            return $cached;
        }
        $value = $loader();
        self::writeCache($key, $value, $ttl);
        return $value;
    }

    private static function record(mixed $value): array
    {
        return is_array($value) ? $value : [];
    }

    private static function text(mixed $value): string
    {
        return is_string($value) ? trim($value) : (is_int($value) || is_float($value) ? (string) $value : '');
    }
}
