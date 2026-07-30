<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;
use Throwable;

final class Providers
{
    private const MOBILE_DEFAULT = 'https://api.mobileapi.dev';

    public static function specificationsList(array $query = []): array
    {
        if (self::mobileApiConfigured()) {
            try {
                return self::listMobileDevices($query);
            } catch (Throwable) {
                // The local catalog is the availability fallback.
            }
        }
        $devices = Search::searchDevices([
            'query' => $query['query'] ?? '',
            'category' => $query['category'] ?? 'all',
            'brand' => $query['manufacturer'] ?? '',
        ]);
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(30, max(1, (int) ($query['limit'] ?? 24)));
        return self::page($devices, $page, $limit, 'catalog');
    }

    public static function specificationsGet(string $slugOrId): ?array
    {
        if (self::mobileApiConfigured() && ctype_digit($slugOrId)) {
            try {
                return self::getMobileDevice($slugOrId);
            } catch (Throwable) {
                // Continue to the local catalog.
            }
        }
        return LiveCatalog::resolveLiveDevice($slugOrId);
    }

    public static function getImages(string $deviceId): array
    {
        if (self::mobileApiConfigured() && ctype_digit($deviceId)) {
            try {
                $payload = self::mobileRequest('/devices/' . $deviceId . '/images/');
                $rows = is_array($payload) ? $payload : (array) ($payload['images'] ?? []);
                $images = [];
                foreach ($rows as $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $url = self::httpsUrl($row['image_url'] ?? null);
                    if ($url !== null) {
                        $images[] = [
                            'url' => $url,
                            'sourceUrl' => self::MOBILE_DEFAULT . '/devices/' . $deviceId . '/',
                            'provider' => 'MobileAPI',
                            'license' => 'Provider media terms',
                            'verifiedAt' => date('c'),
                            'type' => (string) ($row['type'] ?? 'gallery'),
                            'caption' => (string) ($row['caption'] ?? ''),
                            'isOfficial' => (bool) ($row['is_official'] ?? false),
                            'order' => (int) ($row['order'] ?? 0),
                        ];
                    }
                }
                usort($images, static fn (array $a, array $b): int => $a['order'] <=> $b['order']);
                if ($images !== []) {
                    return $images;
                }
            } catch (Throwable) {
                // Return catalog fixtures below.
            }
        }
        $device = Catalog::getDevice($deviceId);
        if ($device === null) {
            return [];
        }
        $images = [];
        $primary = $device['image'] ?? [];
        if (!empty($primary['url'])) {
            $images[] = $primary;
        }
        foreach ((array) ($device['photos'] ?? []) as $photo) {
            if (!is_array($photo) || empty($photo['url'])) {
                continue;
            }
            $images[] = [
                'url' => $photo['url'],
                'sourceUrl' => $device['officialUrl'] ?? '',
                'provider' => 'Circuit Media catalog',
                'license' => 'Catalog media',
                'verifiedAt' => $device['lastUpdated'] ?? date('c'),
                'color' => $photo['color'] ?? 'Default',
            ];
        }
        return self::uniqueBy($images, 'url');
    }

    public static function getOffers(string $deviceId): array
    {
        $device = Catalog::getDevice($deviceId);
        if ($device === null || !is_numeric($device['startingPrice'] ?? null)) {
            return [];
        }
        return [[
            'retailer' => 'Source-listed price',
            'price' => (float) $device['startingPrice'],
            'currency' => (string) ($device['currency'] ?? 'USD'),
            'url' => (string) ($device['officialUrl'] ?? ''),
            'checkedAt' => (string) ($device['lastUpdated'] ?? date('c')),
        ]];
    }

    public static function getProfessionalReviews(string $deviceId): array
    {
        $review = Reviews::reviewForDevice($deviceId);
        return $review !== null ? [$review] : [];
    }

    public static function getBenchmarks(string $deviceId): array
    {
        return [];
    }

    public static function mobileApiConfigured(): bool
    {
        return trim((string) \app_config('env.device_api_key', '')) !== '';
    }

    public static function listMobileDevices(array $query = []): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(30, max(1, (int) ($query['limit'] ?? 24)));
        $name = trim((string) ($query['query'] ?? ''));
        $manufacturer = trim((string) ($query['manufacturer'] ?? ''));
        $category = trim((string) ($query['category'] ?? 'all'));
        $path = '/devices/';
        $parameters = ['page' => $page, 'limit' => $limit];
        if ($name !== '') {
            $path = '/devices/search/';
            $parameters['name'] = $name;
        } elseif ($manufacturer !== '' && $manufacturer !== 'all') {
            $path = '/devices/by-manufacturer/';
            $parameters['manufacturer'] = $manufacturer;
        } elseif ($category !== '' && $category !== 'all') {
            $path = '/devices/by-type/';
            $parameters['type'] = $category === 'watch' ? 'wearable' : $category;
        }
        $payload = self::mobileRequest($path, $parameters);
        $rows = is_array($payload['devices'] ?? null) ? $payload['devices'] : [];
        $devices = array_values(array_filter(array_map(
            static fn (mixed $row): ?array => is_array($row) ? self::normalizeMobileDevice($row) : null,
            $rows
        )));
        return [
            'devices' => $devices,
            'total' => (int) ($payload['total'] ?? count($devices)),
            'page' => (int) ($payload['page'] ?? $page),
            'pageSize' => (int) ($payload['page_size'] ?? $limit),
            'totalPages' => (int) ($payload['total_pages'] ?? max(1, (int) ceil(count($devices) / $limit))),
            'hasNext' => (bool) ($payload['has_next'] ?? false),
            'hasPrevious' => (bool) ($payload['has_previous'] ?? ($page > 1)),
            'provider' => 'mobileapi',
        ];
    }

    public static function getMobileDevice(string|int $id): array
    {
        $id = (string) $id;
        if (!ctype_digit($id)) {
            throw new RuntimeException('Invalid device identifier', 400);
        }
        return self::normalizeMobileDevice(self::mobileRequest('/devices/' . $id . '/'));
    }

    private static function normalizeMobileDevice(array $raw): array
    {
        $manufacturer = is_array($raw['manufacturer'] ?? null) ? $raw['manufacturer'] : [];
        $brand = trim((string) (($raw['manufacturer_name'] ?? null) ?: ($manufacturer['name'] ?? 'Unknown brand')));
        $model = trim((string) (($raw['name'] ?? null) ?: 'Unnamed device'));
        $type = strtolower(trim((string) ($raw['device_type'] ?? '')));
        $category = in_array($type, ['wearable', 'watch', 'smartwatch'], true)
            ? 'watch'
            : (in_array($type, ['phone', 'tablet'], true) ? $type : 'other');
        $groups = [];
        $mapping = [
            'Body' => 'body', 'Display' => 'display', 'Platform' => 'platform', 'Memory' => 'memory',
            'Main camera' => 'main_camera', 'Selfie camera' => 'selfie_camera', 'Sound' => 'sound',
            'Connectivity' => 'comms', 'Features' => 'features', 'Battery' => 'battery',
            'Miscellaneous' => 'misc', 'Network' => 'network',
        ];
        foreach ($mapping as $name => $key) {
            $section = is_array($raw[$key] ?? null) ? $raw[$key] : [];
            $items = [];
            foreach ($section as $label => $value) {
                if (is_scalar($value) && trim((string) $value) !== '') {
                    $items[] = ['label' => ucwords(str_replace('_', ' ', (string) $label)), 'value' => trim((string) $value)];
                }
            }
            if ($items !== []) {
                $groups[] = ['name' => $name, 'items' => $items];
            }
        }
        return [
            'id' => (int) ($raw['id'] ?? 0),
            'brand' => $brand,
            'model' => $model,
            'category' => $category,
            'description' => trim((string) (($raw['description'] ?? null) ?: "{$brand} {$model}.")),
            'releaseDate' => (string) ($raw['release_date'] ?? 'Not confirmed'),
            'imageUrl' => self::httpsUrl($raw['image_url'] ?? null),
            'colors' => array_values(array_filter(array_map('trim', explode(',', (string) ($raw['colors'] ?? ''))))),
            'storage' => (string) ($raw['storage'] ?? 'Not confirmed'),
            'display' => (string) ($raw['screen_resolution'] ?? 'Not confirmed'),
            'chipset' => (string) (($raw['platform']['chipset'] ?? null) ?: ($raw['hardware'] ?? 'Not confirmed')),
            'memory' => (string) (($raw['memory']['internal'] ?? null) ?: ($raw['hardware'] ?? 'Not confirmed')),
            'camera' => (string) ($raw['camera'] ?? 'Not confirmed'),
            'battery' => (string) ($raw['battery_capacity'] ?? 'Not confirmed'),
            'weight' => (string) ($raw['weight'] ?? 'Not confirmed'),
            'thickness' => (string) ($raw['thickness'] ?? 'Not confirmed'),
            'modelNumbers' => (string) ($raw['model_numbers'] ?? 'Not confirmed'),
            'specifications' => $groups,
            'sourceUrl' => self::MOBILE_DEFAULT . '/devices/' . (int) ($raw['id'] ?? 0) . '/',
        ];
    }

    private static function mobileRequest(string $path, array $parameters = []): array
    {
        $key = trim((string) \app_config('env.device_api_key', ''));
        if ($key === '') {
            throw new RuntimeException('MobileAPI is not configured', 503);
        }
        $base = rtrim((string) \app_config('env.device_api_url', self::MOBILE_DEFAULT), '/') . '/';
        $url = $base . ltrim($path, '/');
        if ($parameters !== []) {
            $url .= '?' . http_build_query($parameters);
        }
        [$status, $body] = self::curlJson($url, ['Authorization: Bearer ' . $key]);
        if ($status === 403) {
            $separator = str_contains($url, '?') ? '&' : '?';
            [$status, $body] = self::curlJson($url . $separator . 'key=' . rawurlencode($key));
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException((string) ($body['detail'] ?? "MobileAPI returned {$status}"), $status ?: 502);
        }
        return $body;
    }

    private static function curlJson(string $url, array $headers = []): array
    {
        $curl = curl_init($url);
        if ($curl === false) {
            throw new RuntimeException('Unable to initialize cURL');
        }
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => array_merge(
                ['Accept: application/json', 'User-Agent: CircuitMedia/1.0 (+https://circuit-media.com)'],
                $headers
            ),
        ]);
        $raw = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($raw)) {
            throw new RuntimeException($error ?: 'Provider request failed', 502);
        }
        $body = json_decode($raw, true);
        return [$status, is_array($body) ? $body : []];
    }

    private static function page(array $items, int $page, int $limit, string $provider): array
    {
        $total = count($items);
        $pages = max(1, (int) ceil($total / $limit));
        $page = min($page, $pages);
        return [
            'devices' => array_slice($items, ($page - 1) * $limit, $limit),
            'total' => $total,
            'page' => $page,
            'pageSize' => $limit,
            'totalPages' => $pages,
            'hasNext' => $page < $pages,
            'hasPrevious' => $page > 1,
            'provider' => $provider,
        ];
    }

    private static function httpsUrl(mixed $value): ?string
    {
        $url = is_string($value) ? trim($value) : '';
        return filter_var($url, FILTER_VALIDATE_URL) && str_starts_with($url, 'https://') ? $url : null;
    }

    private static function uniqueBy(array $items, string $key): array
    {
        $seen = [];
        return array_values(array_filter($items, static function (array $item) use ($key, &$seen): bool {
            $value = (string) ($item[$key] ?? '');
            if ($value === '' || isset($seen[$value])) {
                return false;
            }
            $seen[$value] = true;
            return true;
        }));
    }
}
