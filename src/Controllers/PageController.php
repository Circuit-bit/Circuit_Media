<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\Catalog;
use App\Services\GsmArena;
use App\Services\LiveCatalog;
use App\Services\News;
use App\Services\Recommend;
use App\Services\Reviews;
use App\Services\Search;

final class PageController
{
    public static function home(): void
    {
        $featured = LiveCatalog::liveFeatured();
        $popular = $featured['popular'] ?? [];
        $latest = $featured['latest'] ?? [];
        view('pages/home', [
            'title' => 'Circuit Media — Real context for smarter tech choices',
            'popular' => $popular,
            'latest' => $latest,
            'totalDevices' => $featured['totalDevices'] ?? count(Catalog::allDevices()),
            'brandCount' => $featured['brandCount'] ?? count(Search::brands()),
            'compareDefaults' => array_slice($popular, 0, 2),
            'reviews' => Reviews::professionalReviews(),
        ]);
    }

    public static function devices(): void
    {
        $category = strtolower(trim((string) ($_GET['category'] ?? 'all')));
        if (!in_array($category, ['all', 'phone', 'tablet', 'watch'], true)) {
            $category = 'all';
        }
        $labels = [
            'all' => 'Devices',
            'phone' => 'Phones',
            'tablet' => 'Tablets',
            'watch' => 'Watches',
        ];
        self::category($category, $labels[$category]);
    }

    public static function phones(): void
    {
        $_GET['category'] = 'phone';
        self::devices();
    }

    public static function tablets(): void
    {
        $_GET['category'] = 'tablet';
        self::devices();
    }

    public static function watches(): void
    {
        $_GET['category'] = 'watch';
        self::devices();
    }

    private static function category(string $category, string $label): void
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $brand = trim((string) ($_GET['brand'] ?? ''));
        $query = trim((string) ($_GET['q'] ?? ''));
        $result = LiveCatalog::liveList([
            'page' => $page,
            'limit' => 24,
            'category' => $category,
            'brand' => $brand !== '' ? $brand : null,
            'query' => $query !== '' ? $query : null,
        ]);
        $live = LiveCatalog::liveBrands();
        $title = match ($category) {
            'phone' => 'Phones — Circuit Media',
            'tablet' => 'Tablets — Circuit Media',
            'watch' => 'Watches — Circuit Media',
            default => 'Devices — phones, tablets & watches | Circuit Media',
        };
        view('pages/category', [
            'title' => $title,
            'label' => $label,
            'category' => $category,
            'result' => $result,
            'brand' => $brand,
            'query' => $query,
            'totalDevices' => $live['totalDevices'] ?? ($result['total'] ?? 0),
            'brandCount' => count($live['brands'] ?? []),
        ]);
    }

    public static function phoneDetail(string $slug): void
    {
        self::deviceDetail($slug, 'phone');
    }

    public static function tabletDetail(string $slug): void
    {
        self::deviceDetail($slug, 'tablet');
    }

    public static function watchDetail(string $slug): void
    {
        self::deviceDetail($slug, 'watch');
    }

    public static function catalogDetail(string $id): void
    {
        self::deviceDetail($id, null);
    }

    private static function deviceDetail(string $slug, ?string $expectedCategory): void
    {
        $device = LiveCatalog::resolveLiveDevice(urldecode($slug));
        if (!$device) {
            http_response_code(404);
            view('pages/not-found', ['title' => 'Device not found']);
            return;
        }
        if ($expectedCategory && ($device['category'] ?? '') !== $expectedCategory) {
            // Still show the device; category routes are soft.
        }
        $review = Reviews::labReview($device);
        $related = [];
        $category = (string) ($device['category'] ?? 'phone');
        $brand = (string) ($device['brand'] ?? '');
        $selfId = (string) ($device['id'] ?? '');
        foreach (Catalog::allDevices() as $item) {
            if (!is_array($item) || (string) ($item['id'] ?? '') === $selfId) {
                continue;
            }
            if (($item['category'] ?? '') !== $category) {
                continue;
            }
            $related[] = $item;
        }
        usort($related, static function (array $a, array $b) use ($brand, $device): int {
            $aBrand = strcasecmp((string) ($a['brand'] ?? ''), $brand) === 0 ? -1 : 0;
            $bBrand = strcasecmp((string) ($b['brand'] ?? ''), $brand) === 0 ? -1 : 0;
            if ($aBrand !== $bBrand) {
                return $aBrand <=> $bBrand;
            }
            return abs(((float) ($a['score'] ?? 0)) - ((float) ($device['score'] ?? 0)))
                <=> abs(((float) ($b['score'] ?? 0)) - ((float) ($device['score'] ?? 0)));
        });
        $related = array_slice($related, 0, 3);
        // Prefer hydrated live cards with photos when possible.
        $related = array_map(static function (array $item): array {
            $url = $item['image']['url'] ?? null;
            if (is_string($url) && $url !== '') {
                return $item;
            }
            $slug = (string) ($item['sourceSlug'] ?? $item['slug'] ?? '');
            if ($slug === '') {
                return $item;
            }
            try {
                $images = GsmArena::fetchDeviceImageUrls([$slug]);
                $img = $images[strtolower($slug)] ?? null;
                if (is_string($img) && $img !== '') {
                    $item['image']['url'] = $img;
                    $item['photos'] = [['color' => 'Default', 'url' => $img]];
                }
            } catch (\Throwable) {
                // Keep placeholder.
            }
            return $item;
        }, $related);

        view('pages/device', [
            'title' => ($device['brand'] ?? '') . ' ' . ($device['model'] ?? '') . ' — Circuit Media',
            'description' => $device['summary'] ?? '',
            'device' => $device,
            'review' => $review,
            'related' => $related,
        ]);
    }

    public static function brands(): void
    {
        $data = LiveCatalog::liveBrands();
        view('pages/brands', [
            'title' => 'All smartphone brands | Circuit Media',
            'brands' => $data['brands'] ?? [],
            'totalDevices' => $data['totalDevices'] ?? 0,
        ]);
    }

    public static function brandDetail(string $slug): void
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $decoded = urldecode($slug);
        $allBrands = LiveCatalog::liveBrands()['brands'] ?? [];
        $matched = null;
        foreach ($allBrands as $brand) {
            if (!is_array($brand)) {
                continue;
            }
            $brandSlug = (string) ($brand['brandSlug'] ?? '');
            $brandName = (string) ($brand['name'] ?? '');
            if ($brandSlug === $decoded
                || strcasecmp($brandName, $decoded) === 0
                || slugify($brandName) === slugify($decoded)) {
                $matched = $brand;
                break;
            }
        }

        $result = LiveCatalog::liveBrandPage($decoded, $page, 24);
        if (!$result) {
            $result = LiveCatalog::liveList([
                'page' => $page,
                'limit' => 24,
                'brand' => (string) ($matched['name'] ?? $decoded),
            ]);
        }
        if (empty($result['brand']) && $matched) {
            $result['brand'] = $matched;
        } elseif (empty($result['brand'])) {
            $result['brand'] = [
                'name' => $matched['name'] ?? $decoded,
                'brandSlug' => $matched['brandSlug'] ?? $decoded,
                'deviceCount' => (int) ($result['total'] ?? 0),
            ];
        }

        $neighbors = [];
        foreach ($allBrands as $brand) {
            if (!is_array($brand)) {
                continue;
            }
            if (($brand['brandSlug'] ?? '') === ($result['brand']['brandSlug'] ?? '')) {
                continue;
            }
            $neighbors[] = $brand;
            if (count($neighbors) >= 8) {
                break;
            }
        }

        view('pages/brand', [
            'title' => (($result['brand']['name'] ?? $decoded) . ' phones, tablets and watches | Circuit Media'),
            'slug' => $decoded,
            'result' => $result,
            'neighbors' => $neighbors,
        ]);
    }

    public static function search(): void
    {
        $q = trim((string) ($_GET['q'] ?? ''));
        $category = (string) ($_GET['category'] ?? 'all');
        $brand = trim((string) ($_GET['brand'] ?? ''));
        $maxPrice = trim((string) ($_GET['maxPrice'] ?? ''));
        $sort = (string) ($_GET['sort'] ?? 'popular');
        $page = max(1, (int) ($_GET['page'] ?? 1));

        if ($q !== '') {
            $result = LiveCatalog::liveSearch($q, $page, 24, $category, $brand !== '' ? $brand : null);
        } else {
            $result = LiveCatalog::liveList([
                'page' => $page,
                'limit' => 24,
                'category' => $category,
                'brand' => $brand !== '' ? $brand : null,
            ]);
        }

        // Apply local catalog filters when budget/sort are requested.
        if ($maxPrice !== '' || $sort !== 'popular' || ($q === '' && $brand !== '')) {
            $filtered = Search::searchDevices([
                'query' => $q,
                'category' => $category,
                'brand' => $brand,
                'maxPrice' => $maxPrice !== '' ? (float) $maxPrice : null,
                'sort' => $sort,
            ]);
            $total = count($filtered);
            $pageSize = 24;
            $slice = array_slice($filtered, ($page - 1) * $pageSize, $pageSize);
            $result = [
                'devices' => $slice,
                'total' => $total,
                'page' => $page,
                'pageSize' => $pageSize,
                'totalPages' => max(1, (int) ceil($total / $pageSize)),
                'hasNext' => ($page * $pageSize) < $total,
                'hasPrevious' => $page > 1,
                'provider' => 'catalog',
            ];
        }

        $brandData = LiveCatalog::liveBrands();
        $brands = array_values(array_filter(array_map(
            static fn ($b) => (string) ($b['name'] ?? ''),
            $brandData['brands'] ?? []
        )));
        if ($brands === []) {
            $brands = Search::brands();
        }

        view('pages/search', [
            'title' => 'Search — Circuit Media',
            'q' => $q,
            'category' => $category,
            'brand' => $brand,
            'maxPrice' => $maxPrice,
            'sort' => $sort,
            'result' => $result,
            'brands' => $brands,
        ]);
    }

    public static function compare(): void
    {
        $raw = (string) ($_GET['devices'] ?? $_GET['ids'] ?? '');
        $requestedIds = array_values(array_filter(array_map('trim', explode(',', $raw))));

        $mapOption = static fn (array $device): array => [
            'id' => (string) ($device['id'] ?? ''),
            'brand' => (string) ($device['brand'] ?? ''),
            'model' => (string) ($device['model'] ?? ''),
            'category' => (string) ($device['category'] ?? 'phone'),
        ];

        // Full catalog options so the picker can see every cached phone/tablet/watch
        // (live search then expands beyond the local set, matching workers.dev).
        $all = Catalog::allDevices();
        $options = array_values(array_map($mapOption, $all));

        $requested = [];
        foreach ($requestedIds as $id) {
            $device = LiveCatalog::resolveLiveDevice($id) ?? Catalog::getDevice($id);
            if (is_array($device)) {
                $requested[] = $device;
            }
            if (count($requested) >= 4) {
                break;
            }
        }

        $category = (string) (($requested[0]['category'] ?? null) ?: 'phone');
        $fallbackPool = array_values(array_filter(
            $all,
            static function (array $device) use ($category, $requested): bool {
                if (($device['category'] ?? 'phone') !== $category) {
                    return false;
                }
                foreach ($requested as $picked) {
                    if (($picked['id'] ?? '') === ($device['id'] ?? '')) {
                        return false;
                    }
                }
                return true;
            }
        ));

        $initialDevices = count($requested) >= 2
            ? array_slice($requested, 0, 4)
            : array_slice(array_merge($requested, $fallbackPool), 0, 2);

        view('pages/compare', [
            'title' => 'Compare devices | Circuit Media',
            'options' => $options,
            'initialDevices' => $initialDevices,
        ]);
    }

    public static function recommend(): void
    {
        $live = LiveCatalog::liveBrands();
        $brandNames = array_values(array_filter(array_map(
            static fn ($b) => (string) ($b['name'] ?? ''),
            $live['brands'] ?? []
        )));
        view('pages/recommend', [
            'title' => 'AI-powered device recommendations | Circuit Media',
            'scenarios' => Recommend::SCENARIOS,
            'mustHaves' => Recommend::MUST_HAVES,
            'brands' => $brandNames !== [] ? $brandNames : Search::brands(),
            'totalDevices' => $live['totalDevices'] ?? count(Catalog::allDevices()),
            'cachedDevices' => count(Catalog::allDevices()),
        ]);
    }

    public static function news(): void
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $result = News::listArticles($page, 24);
        view('pages/news', [
            'title' => 'Tech News — Circuit Media',
            'description' => 'Everyday tech headlines for phones, tablets, wearables, and the wider industry.',
            'result' => $result,
        ]);
    }

    public static function newsDetail(string $slug): void
    {
        $article = News::getArticle(urldecode($slug));
        if ($article === null) {
            http_response_code(404);
            view('pages/not-found', ['title' => 'Story not found']);
            return;
        }
        view('pages/news-detail', [
            'title' => ((string) ($article['title'] ?? 'Story')) . ' — Circuit Media',
            'description' => (string) ($article['excerpt'] ?? ''),
            'article' => $article,
        ]);
    }

    public static function reviews(): void
    {
        $devices = array_slice(Catalog::allDevices(), 0, 24);
        $reviews = array_map(static fn ($d) => Reviews::labReview($d), $devices);
        view('pages/reviews', [
            'title' => 'Reviews — Circuit Media',
            'reviews' => $reviews,
        ]);
    }

    public static function reviewDetail(string $slug): void
    {
        $device = LiveCatalog::resolveLiveDevice(urldecode($slug)) ?? Catalog::getDevice(urldecode($slug));
        if (!$device) {
            http_response_code(404);
            view('pages/not-found', ['title' => 'Review not found']);
            return;
        }
        view('pages/review', [
            'title' => 'Review: ' . ($device['brand'] ?? '') . ' ' . ($device['model'] ?? ''),
            'device' => $device,
            'review' => Reviews::labReview($device),
        ]);
    }

    public static function admin(): void
    {
        view('pages/admin', [
            'title' => 'Admin — Circuit Media',
        ]);
    }

    public static function info(string $slug): void
    {
        $pages = [
            'about' => ['About Circuit Media', 'Circuit Media is a review and comparison publication for smartphones, tablets, and smartwatches.'],
            'privacy' => ['Privacy', 'We store only what is needed to operate the site. Sensitive credentials stay server-side.'],
            'methodology' => ['Methodology', 'Scores and recommendations are computed from published specification fields with clear weights. AI never invents specs or reorders rankings.'],
            'contact' => ['Contact', 'Email hello@circuit-media-review.com'],
        ];
        if (!isset($pages[$slug])) {
            http_response_code(404);
            view('pages/not-found', ['title' => 'Not found']);
            return;
        }
        [$title, $body] = $pages[$slug];
        view('pages/info', [
            'title' => $title . ' — Circuit Media',
            'heading' => $title,
            'body' => $body,
        ]);
    }
}
