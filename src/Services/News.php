<?php

declare(strict_types=1);

namespace App\Services;

final class News
{
    private const CACHE_TTL = 2700; // 45 minutes
    private const DEFAULT_FEEDS = [
        ['name' => 'The Verge', 'url' => 'https://www.theverge.com/rss/index.xml'],
        ['name' => 'Android Authority', 'url' => 'https://www.androidauthority.com/feed/'],
        ['name' => '9to5Google', 'url' => 'https://9to5google.com/feed/'],
        ['name' => 'Engadget', 'url' => 'https://www.engadget.com/rss.xml'],
        ['name' => 'GSMArena', 'url' => 'https://www.gsmarena.com/rss-news-reviews.php'],
    ];

    /** @var array<string, array{expires:int,value:mixed}> */
    private static array $memoryCache = [];

    /**
     * @return array{articles:list<array>,total:int,page:int,pageSize:int,totalPages:int,hasNext:bool,hasPrevious:bool}
     */
    public static function listArticles(int $page = 1, int $limit = 24): array
    {
        $page = max(1, $page);
        $limit = min(48, max(1, $limit));
        $all = self::allArticles();
        $total = count($all);
        $totalPages = max(1, (int) ceil($total / $limit));
        $safePage = min($page, $totalPages);
        return [
            'articles' => array_slice($all, ($safePage - 1) * $limit, $limit),
            'total' => $total,
            'page' => $safePage,
            'pageSize' => $limit,
            'totalPages' => $totalPages,
            'hasNext' => $safePage < $totalPages,
            'hasPrevious' => $safePage > 1,
        ];
    }

    public static function getArticle(string $slug): ?array
    {
        $needle = strtolower(trim($slug));
        if ($needle === '') {
            return null;
        }
        foreach (self::allArticles() as $article) {
            if (($article['slug'] ?? '') === $needle || ($article['id'] ?? '') === $needle) {
                return $article;
            }
        }
        return null;
    }

    /** @return list<array> */
    public static function allArticles(): array
    {
        return self::cached('news:merged', self::CACHE_TTL, static function (): array {
            $feeds = self::feeds();
            $merged = [];
            $seenUrl = [];
            $seenTitle = [];

            foreach ($feeds as $feed) {
                $name = (string) ($feed['name'] ?? 'Tech');
                $url = (string) ($feed['url'] ?? '');
                if ($url === '') {
                    continue;
                }
                try {
                    $items = self::fetchFeed($url, $name);
                } catch (\Throwable) {
                    continue;
                }
                foreach ($items as $item) {
                    $link = strtolower((string) ($item['url'] ?? ''));
                    $titleKey = strtolower(preg_replace('/\s+/', ' ', (string) ($item['title'] ?? '')) ?? '');
                    if ($link !== '' && isset($seenUrl[$link])) {
                        continue;
                    }
                    if ($titleKey !== '' && isset($seenTitle[$titleKey])) {
                        continue;
                    }
                    if ($link !== '') {
                        $seenUrl[$link] = true;
                    }
                    if ($titleKey !== '') {
                        $seenTitle[$titleKey] = true;
                    }
                    $merged[] = $item;
                }
            }

            if ($merged === []) {
                $merged = self::fallbackArticles();
            }

            usort($merged, static function (array $a, array $b): int {
                return strcmp((string) ($b['publishedAt'] ?? ''), (string) ($a['publishedAt'] ?? ''));
            });

            return array_values($merged);
        });
    }

    /** @return list<array{name:string,url:string}> */
    private static function feeds(): array
    {
        $configured = \app_config('env.news_feeds', null);
        if (is_array($configured) && $configured !== []) {
            $out = [];
            foreach ($configured as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $name = trim((string) ($row['name'] ?? ''));
                $url = trim((string) ($row['url'] ?? ''));
                if ($name !== '' && $url !== '') {
                    $out[] = ['name' => $name, 'url' => $url];
                }
            }
            if ($out !== []) {
                return $out;
            }
        }
        return self::DEFAULT_FEEDS;
    }

    /** @return list<array> */
    private static function fetchFeed(string $feedUrl, string $sourceName): array
    {
        $cacheKey = 'news:feed:' . hash('sha256', $feedUrl);
        return self::cached($cacheKey, self::CACHE_TTL, static function () use ($feedUrl, $sourceName): array {
            $xml = self::httpGet($feedUrl);
            if ($xml === '') {
                return [];
            }
            return self::parseFeedXml($xml, $sourceName);
        });
    }

    private static function httpGet(string $url): string
    {
        $curl = curl_init($url);
        if ($curl === false) {
            return '';
        }
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_USERAGENT => 'CircuitMediaNews/1.0 (+https://circuitmedia.site.je)',
            CURLOPT_HTTPHEADER => ['Accept: application/rss+xml, application/atom+xml, application/xml, text/xml, */*'],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if (!is_string($body) || $status < 200 || $status >= 300) {
            return '';
        }
        return $body;
    }

    /** @return list<array> */
    private static function parseFeedXml(string $xml, string $sourceName): array
    {
        $previous = libxml_use_internal_errors(true);
        $doc = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if ($doc === false) {
            return [];
        }

        $items = [];
        $entries = [];
        if (isset($doc->channel->item)) {
            foreach ($doc->channel->item as $entry) {
                $entries[] = $entry;
            }
        } elseif (isset($doc->entry)) {
            foreach ($doc->entry as $entry) {
                $entries[] = $entry;
            }
        }

        foreach ($entries as $entry) {
            $normalized = self::normalizeEntry($entry, $sourceName);
            if ($normalized !== null) {
                $items[] = $normalized;
            }
        }
        return $items;
    }

    private static function normalizeEntry(\SimpleXMLElement $entry, string $sourceName): ?array
    {
        $title = self::text((string) ($entry->title ?? ''));
        if ($title === '') {
            return null;
        }

        $link = '';
        if (isset($entry->link)) {
            $linkAttr = $entry->link['href'] ?? null;
            if (is_object($linkAttr) || is_string($linkAttr)) {
                $link = self::text((string) $linkAttr);
            }
            if ($link === '') {
                $link = self::text((string) $entry->link);
            }
        }
        if ($link === '' && isset($entry->guid)) {
            $guid = self::text((string) $entry->guid);
            if (str_starts_with($guid, 'http')) {
                $link = $guid;
            }
        }
        if ($link === '' || !preg_match('#^https?://#i', $link)) {
            return null;
        }

        $rawDate = self::text((string) ($entry->pubDate ?? $entry->published ?? $entry->updated ?? ''));
        $timestamp = $rawDate !== '' ? strtotime($rawDate) : false;
        $publishedAt = $timestamp ? gmdate('c', $timestamp) : gmdate('c');

        $excerpt = self::text((string) ($entry->description ?? $entry->summary ?? ''));
        if ($excerpt === '' && isset($entry->children('content', true)->encoded)) {
            $excerpt = self::text((string) $entry->children('content', true)->encoded);
        }
        $excerpt = self::excerpt($excerpt);

        $image = self::extractImage($entry, (string) ($entry->description ?? $entry->summary ?? ''));

        $idSeed = strtolower($link);
        $id = substr(hash('sha256', $idSeed), 0, 16);
        $slug = \slugify($title) . '-' . $id;

        return [
            'id' => $id,
            'slug' => $slug,
            'title' => $title,
            'excerpt' => $excerpt,
            'url' => $link,
            'image' => $image,
            'sourceName' => $sourceName,
            'publishedAt' => $publishedAt,
        ];
    }

    private static function extractImage(\SimpleXMLElement $entry, string $html): ?string
    {
        $media = $entry->children('media', true);
        if (isset($media->content)) {
            $url = self::text((string) ($media->content['url'] ?? ''));
            if ($url !== '' && preg_match('#^https?://#i', $url)) {
                return $url;
            }
        }
        if (isset($media->thumbnail)) {
            $url = self::text((string) ($media->thumbnail['url'] ?? ''));
            if ($url !== '' && preg_match('#^https?://#i', $url)) {
                return $url;
            }
        }
        if (isset($entry->enclosure['url'])) {
            $url = self::text((string) $entry->enclosure['url']);
            $type = strtolower((string) ($entry->enclosure['type'] ?? ''));
            if ($url !== '' && (str_starts_with($type, 'image/') || preg_match('/\.(jpe?g|png|webp|gif)(\?|$)/i', $url))) {
                return $url;
            }
        }
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $m)) {
            $url = self::text(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($url !== '' && preg_match('#^https?://#i', $url)) {
                return $url;
            }
        }
        return null;
    }

    private static function excerpt(string $html): string
    {
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        $text = trim($text);
        if (mb_strlen($text) > 220) {
            return rtrim(mb_substr($text, 0, 217)) . '…';
        }
        return $text;
    }

    private static function text(string $value): string
    {
        return trim(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    /** @return list<array> */
    private static function fallbackArticles(): array
    {
        $path = dirname(__DIR__, 2) . '/data/news-fallback.json';
        if (!is_file($path)) {
            return [];
        }
        $decoded = json_decode((string) file_get_contents($path), true);
        if (!is_array($decoded)) {
            return [];
        }
        $articles = is_array($decoded['articles'] ?? null) ? $decoded['articles'] : $decoded;
        $out = [];
        foreach ($articles as $row) {
            if (!is_array($row) || empty($row['title']) || empty($row['url'])) {
                continue;
            }
            $title = (string) $row['title'];
            $url = (string) $row['url'];
            $id = (string) ($row['id'] ?? substr(hash('sha256', strtolower($url)), 0, 16));
            $out[] = [
                'id' => $id,
                'slug' => (string) ($row['slug'] ?? (\slugify($title) . '-' . $id)),
                'title' => $title,
                'excerpt' => (string) ($row['excerpt'] ?? ''),
                'url' => $url,
                'image' => $row['image'] ?? null,
                'sourceName' => (string) ($row['sourceName'] ?? 'Circuit Media'),
                'publishedAt' => (string) ($row['publishedAt'] ?? gmdate('c')),
            ];
        }
        return $out;
    }

    private static function cached(string $key, int $ttl, callable $loader): mixed
    {
        $now = time();
        if (isset(self::$memoryCache[$key]) && self::$memoryCache[$key]['expires'] >= $now) {
            return self::$memoryCache[$key]['value'];
        }
        $directory = dirname(__DIR__, 2) . '/data/cache';
        $file = $directory . '/news-' . hash('sha256', $key) . '.json';
        if (is_file($file) && filemtime($file) !== false && filemtime($file) + $ttl >= $now) {
            $decoded = json_decode((string) file_get_contents($file), true);
            if (is_array($decoded) && array_key_exists('value', $decoded)) {
                self::$memoryCache[$key] = ['expires' => $now + $ttl, 'value' => $decoded['value']];
                return $decoded['value'];
            }
        }
        $value = $loader();
        self::$memoryCache[$key] = ['expires' => $now + $ttl, 'value' => $value];
        if (!is_dir($directory)) {
            @mkdir($directory, 0775, true);
        }
        if (is_dir($directory) && is_writable($directory)) {
            @file_put_contents($file, json_encode(['value' => $value], JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
        return $value;
    }
}
