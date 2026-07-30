<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Database;
use App\Http\AdminAuth;
use App\Http\JsonResponse;
use App\Http\RateLimiter;
use App\Http\Request;
use App\Services\AiClient;
use App\Services\Catalog;
use App\Services\Compare;
use App\Services\GsmArena;
use App\Services\LiveCatalog;
use App\Services\News;
use App\Services\Providers;
use App\Services\Recommend;
use App\Services\Reviews;
use App\Services\Search;

final class ApiController
{
    private static function limited(int $max = 60, int $window = 60): bool
    {
        $hit = RateLimiter::hit(Request::ip(), $max, $window);
        if ($hit) {
            JsonResponse::error($hit['error'], 429, ['retry_after' => $hit['retry_after'] ?? $window]);
            return true;
        }
        return false;
    }

    public static function brands(): void
    {
        if (self::limited()) {
            return;
        }
        $data = LiveCatalog::liveBrands();
        JsonResponse::send($data['brands'] ?? [], 200, [
            'totalDevices' => $data['totalDevices'] ?? 0,
            'requestId' => Request::id(),
        ]);
    }

    public static function news(): void
    {
        if (self::limited()) {
            return;
        }
        $page = max(1, (int) Request::query('page', 1));
        $limit = min(48, max(1, (int) Request::query('limit', 24)));
        $result = News::listArticles($page, $limit);
        JsonResponse::send($result['articles'] ?? [], 200, [
            'total' => $result['total'] ?? 0,
            'page' => $result['page'] ?? $page,
            'pageSize' => $result['pageSize'] ?? $limit,
            'totalPages' => $result['totalPages'] ?? 1,
            'requestId' => Request::id(),
        ]);
    }

    public static function categories(): void
    {
        $devices = Catalog::allDevices();
        $categories = [
            ['key' => 'phone', 'label' => 'Smartphones', 'href' => '/phones'],
            ['key' => 'tablet', 'label' => 'Tablets', 'href' => '/tablets'],
            ['key' => 'watch', 'label' => 'Smartwatches', 'href' => '/watches'],
        ];
        $data = array_map(static function ($category) use ($devices) {
            $category['count'] = count(array_filter($devices, static fn ($d) => ($d['category'] ?? '') === $category['key']));
            return $category;
        }, $categories);
        JsonResponse::send($data);
    }

    public static function devices(): void
    {
        if (self::limited()) {
            return;
        }
        $page = max(1, (int) Request::query('page', 1));
        $limit = min(48, max(1, (int) Request::query('limit', 24)));
        $category = (string) Request::query('category', 'all');
        $brand = Request::query('brand');
        $query = Request::query('q') ?? Request::query('query');
        $source = strtolower((string) Request::query('source', 'live'));

        // Compare/recommend pickers need scored catalog rows, not empty live stubs.
        if ($source === 'catalog') {
            $all = Search::searchDevices([
                'query' => $query ?? '',
                'category' => $category,
                'brand' => $brand ?? '',
                'sort' => 'popular',
            ]);
            $total = count($all);
            $slice = array_slice($all, ($page - 1) * $limit, $limit);
            JsonResponse::send($slice, 200, [
                'page' => $page,
                'total' => $total,
                'requestId' => Request::id(),
            ]);
            return;
        }

        $result = LiveCatalog::liveList([
            'page' => $page,
            'limit' => $limit,
            'category' => $category,
            'brand' => $brand,
            'query' => $query,
        ]);
        JsonResponse::send($result['devices'] ?? [], 200, [
            'page' => $result['page'] ?? 1,
            'total' => $result['total'] ?? 0,
            'requestId' => Request::id(),
        ]);
    }

    public static function device(string $slug): void
    {
        if (self::limited()) {
            return;
        }
        $device = LiveCatalog::resolveLiveDevice(urldecode($slug));
        if (!$device) {
            JsonResponse::error('Device not found', 404);
            return;
        }
        JsonResponse::send($device, 200, ['requestId' => Request::id()]);
    }

    public static function catalog(string $id): void
    {
        self::device($id);
    }

    public static function catalogImages(string $id): void
    {
        if (self::limited()) {
            return;
        }
        JsonResponse::send(Providers::getImages(urldecode($id)), 200, ['requestId' => Request::id()]);
    }

    public static function search(): void
    {
        if (self::limited()) {
            return;
        }
        $q = trim((string) (Request::query('q') ?? Request::query('query') ?? ''));
        $category = (string) Request::query('category', 'all');
        $page = max(1, (int) Request::query('page', 1));
        $limit = min(48, max(1, (int) Request::query('limit', 24)));
        $source = strtolower((string) Request::query('source', 'live'));

        if ($source === 'catalog' || $q === '') {
            $all = $q === ''
                ? []
                : Search::searchDevices([
                    'query' => $q,
                    'category' => $category,
                    'sort' => 'popular',
                ]);
            $total = count($all);
            JsonResponse::send(array_slice($all, ($page - 1) * $limit, $limit), 200, [
                'total' => $total,
                'requestId' => Request::id(),
            ]);
            return;
        }

        $result = LiveCatalog::liveSearch($q, $page, $limit, $category);
        // Prefer catalog hits first so compare/search pickers keep resolvable ids.
        $catalogHits = Search::searchDevices([
            'query' => $q,
            'category' => $category,
            'sort' => 'popular',
        ]);
        $merged = [];
        $seen = [];
        foreach (array_merge(array_slice($catalogHits, 0, 12), $result['devices'] ?? []) as $device) {
            if (!is_array($device)) {
                continue;
            }
            $key = (string) ($device['id'] ?? $device['slug'] ?? '');
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $merged[] = $device;
            if (count($merged) >= $limit) {
                break;
            }
        }
        JsonResponse::send($merged, 200, [
            'total' => max((int) ($result['total'] ?? 0), count($catalogHits)),
            'requestId' => Request::id(),
        ]);
    }

    public static function compare(): void
    {
        if (self::limited()) {
            return;
        }
        $body = Request::json();
        $ids = $body['ids'] ?? $body['deviceIds'] ?? [];
        if (is_string($ids)) {
            $ids = array_filter(array_map('trim', explode(',', $ids)));
        }
        if (!is_array($ids) || count($ids) < 2 || count($ids) > 4) {
            JsonResponse::error('Provide 2–4 device ids', 400);
            return;
        }
        $priorities = is_array($body['priorities'] ?? null) ? $body['priorities'] : [];
        try {
            JsonResponse::send(Compare::sideBySide(array_values($ids), $priorities), 200, ['requestId' => Request::id()]);
        } catch (\Throwable $e) {
            JsonResponse::error($e->getMessage(), $e->getCode() >= 400 && $e->getCode() < 600 ? (int) $e->getCode() : 400);
        }
    }

    public static function recommendGet(): void
    {
        JsonResponse::send([
            'scenarios' => Recommend::SCENARIOS,
            'mustHaves' => Recommend::MUST_HAVES,
            'endpoint' => 'POST /api/recommend',
        ]);
    }

    public static function recommendPost(): void
    {
        if (self::limited(30, 60)) {
            return;
        }
        $body = Request::json();
        $result = Recommend::recommend([
            'scenario' => $body['scenario'] ?? 'everyday',
            'category' => $body['category'] ?? 'all',
            'budgetMax' => isset($body['budgetMax']) ? (float) $body['budgetMax'] : null,
            'brands' => $body['brands'] ?? [],
            'mustHave' => $body['mustHave'] ?? [],
            'includeOlder' => (bool) ($body['includeOlder'] ?? false),
            'limit' => (int) ($body['limit'] ?? 8),
        ]);
        $narrative = null;
        if (!empty($body['withAi']) && !empty($result['recommendations'][0])) {
            $narrative = AiClient::summarize($result['recommendations'][0]['device']);
        }
        JsonResponse::send($result, 200, [
            'requestId' => Request::id(),
            'ai' => $narrative,
        ]);
    }

    public static function reviews(string $deviceId): void
    {
        if (self::limited()) {
            return;
        }
        $data = Providers::getProfessionalReviews(urldecode($deviceId));
        if (!$data) {
            $device = Catalog::getDevice(urldecode($deviceId));
            $data = $device ? [Reviews::labReview($device)] : [];
        }
        JsonResponse::send($data, 200, ['requestId' => Request::id()]);
    }

    public static function userReviewsPost(): void
    {
        if (self::limited(5, 3600)) {
            return;
        }
        $body = Request::json();
        if (!empty($body['website'])) {
            JsonResponse::send(['ok' => true, 'status' => 'pending'], 202);
            return;
        }
        $deviceId = (string) ($body['deviceId'] ?? '');
        $device = Catalog::getDevice($deviceId);
        $rating = (int) ($body['rating'] ?? 0);
        $title = sanitize_text($body['title'] ?? null, 100);
        $text = sanitize_text($body['body'] ?? null, 2000);
        if (!$device || $rating < 1 || $rating > 5 || strlen($title) < 3 || strlen($text) < 20) {
            JsonResponse::error('A valid device, 1–5 rating, title and review body are required', 400);
            return;
        }
        $id = cuid();
        try {
            $pdo = Database::pdo();
            $pdo->prepare('INSERT INTO user_reviews (id, device_id, rating, title, body, status) VALUES (?,?,?,?,?,?)')
                ->execute([$id, $device['id'], $rating, $title, $text, 'PENDING']);
        } catch (\Throwable) {
            // DB optional for demo — still acknowledge
        }
        JsonResponse::send([
            'id' => $id,
            'deviceId' => $device['id'],
            'rating' => $rating,
            'title' => $title,
            'body' => $text,
            'status' => 'pending',
        ], 202);
    }

    public static function prices(string $deviceId): void
    {
        if (self::limited()) {
            return;
        }
        JsonResponse::send(Providers::getOffers(urldecode($deviceId)), 200, [
            'requestId' => Request::id(),
        ]);
    }

    public static function aiSummarize(): void
    {
        if (self::limited(20, 60)) {
            return;
        }
        $body = Request::json();
        $device = null;
        if (!empty($body['deviceId'])) {
            $device = LiveCatalog::resolveLiveDevice((string) $body['deviceId']);
        } elseif (!empty($body['device']) && is_array($body['device'])) {
            $device = $body['device'];
        }
        if (!$device) {
            JsonResponse::error('deviceId or device required', 400);
            return;
        }
        JsonResponse::send(AiClient::summarize($device), 200, ['requestId' => Request::id()]);
    }

    public static function aiCompare(): void
    {
        if (self::limited(20, 60)) {
            return;
        }
        $body = Request::json();
        $ids = $body['ids'] ?? $body['deviceIds'] ?? [];
        if (!is_array($ids) || count($ids) < 2) {
            JsonResponse::error('Provide at least 2 device ids', 400);
            return;
        }
        $devices = [];
        foreach ($ids as $id) {
            $device = LiveCatalog::resolveLiveDevice((string) $id);
            if ($device) {
                $devices[] = $device;
            }
        }
        if (count($devices) < 2) {
            JsonResponse::error('Could not resolve devices', 404);
            return;
        }
        JsonResponse::send(AiClient::compare($devices, $body['priorities'] ?? []), 200, ['requestId' => Request::id()]);
    }

    public static function adminImportGet(): void
    {
        JsonResponse::send([
            'endpoint' => 'POST /api/admin/import',
            'authorization' => 'Bearer ADMIN_API_TOKEN',
            'body' => ['provider' => 'fixture|configured-provider', 'fullRefresh' => false],
        ]);
    }

    public static function adminImportPost(): void
    {
        $unauthorized = AdminAuth::requireToken();
        if ($unauthorized) {
            JsonResponse::error($unauthorized['error'], $unauthorized['status']);
            return;
        }
        $body = Request::json();
        $provider = (string) ($body['provider'] ?? 'all');
        $jobId = cuid();
        $imported = 0;
        try {
            if ($provider === 'all' || $provider === 'gsmarena' || $provider === 'live') {
                $brands = GsmArena::listGsmBrands();
                $imported = count($brands);
            }
        } catch (\Throwable) {
            // queued semantics even if live call fails
        }
        JsonResponse::send([
            'jobId' => $jobId,
            'status' => 'queued',
            'provider' => $provider,
            'importedHint' => $imported,
        ], 202, ['requestId' => Request::id()]);
    }

    public static function adminVerify(): void
    {
        $unauthorized = AdminAuth::requireToken();
        if ($unauthorized) {
            JsonResponse::error($unauthorized['error'], $unauthorized['status']);
            return;
        }
        $body = Request::json();
        $deviceId = (string) ($body['deviceId'] ?? '');
        $fieldPath = (string) ($body['fieldPath'] ?? '');
        $sourceId = (string) ($body['sourceId'] ?? '');
        $status = strtolower((string) ($body['status'] ?? ''));
        if ($deviceId === '' || $fieldPath === '' || $sourceId === '' || !in_array($status, ['verified', 'conflicting', 'unverified'], true)) {
            JsonResponse::error('deviceId, fieldPath, sourceId and a valid status are required', 400);
            return;
        }
        $id = cuid();
        $note = sanitize_text($body['note'] ?? null, 500);
        try {
            $pdo = Database::pdo();
            // Ensure source exists
            $pdo->prepare('INSERT IGNORE INTO data_sources (id, provider, url) VALUES (?, ?, ?)')
                ->execute([$sourceId, 'admin', 'admin://' . $sourceId]);
            $pdo->prepare('INSERT INTO verification_records (id, device_id, source_id, field_path, status, note, verified_by) VALUES (?,?,?,?,?,?,?)')
                ->execute([$id, $deviceId, $sourceId, $fieldPath, strtoupper($status), $note, 'admin']);
        } catch (\Throwable) {
            // acknowledge even without DB
        }
        JsonResponse::send([
            'id' => $id,
            'deviceId' => $deviceId,
            'fieldPath' => $fieldPath,
            'sourceId' => $sourceId,
            'status' => $status,
            'note' => $note,
            'verifiedAt' => gmdate('c'),
        ], 201, ['requestId' => Request::id()]);
    }
}
