<?php

declare(strict_types=1);

/**
 * Global helpers available after bootstrap.
 */

function app_config(?string $key = null, mixed $default = null): mixed
{
    $config = $GLOBALS['app_config'] ?? [];
    if ($key === null) {
        return $config;
    }
    $parts = explode('.', $key);
    $cursor = $config;
    foreach ($parts as $part) {
        if (!is_array($cursor) || !array_key_exists($part, $cursor)) {
            return $default;
        }
        $cursor = $cursor[$part];
    }
    return $cursor;
}

function base_path(): string
{
    return rtrim((string) app_config('env.base_path', ''), '/');
}

function url(string $path = '/'): string
{
    $path = '/' . ltrim($path, '/');
    if ($path === '//') {
        $path = '/';
    }
    return base_path() . ($path === '/' ? '/' : rtrim($path, '/'));
}

function asset(string $path): string
{
    return url('/' . ltrim($path, '/'));
}

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function view(string $name, array $data = []): void
{
    $file = dirname(__DIR__) . '/views/' . $name . '.php';
    if (!is_file($file)) {
        http_response_code(500);
        echo 'View not found: ' . e($name);
        return;
    }
    extract($data, EXTR_SKIP);
    $site = app_config('site');
    $title = $data['title'] ?? ($site['name'] ?? 'Circuit Media');
    $description = $data['description'] ?? ($site['description'] ?? '');
    ob_start();
    require $file;
    $content = ob_get_clean();
    require dirname(__DIR__) . '/views/layouts/main.php';
}

function partial(string $name, array $data = []): void
{
    $file = dirname(__DIR__) . '/views/partials/' . $name . '.php';
    if (!is_file($file)) {
        return;
    }
    extract($data, EXTR_SKIP);
    require $file;
}

function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? '';
    return trim($text, '-') ?: 'item';
}

function cuid(): string
{
    return 'c' . bin2hex(random_bytes(12));
}

function sanitize_text(?string $text, int $max = 500): string
{
    $text = trim(strip_tags((string) $text));
    if (mb_strlen($text) > $max) {
        return mb_substr($text, 0, $max);
    }
    return $text;
}

function device_path(array $device): string
{
    $category = $device['category'] ?? 'phone';
    $plural = match ($category) {
        'tablet' => 'tablets',
        'watch' => 'watches',
        default => 'phones',
    };
    return url('/' . $plural . '/' . ($device['slug'] ?? ''));
}

/**
 * Neon device-outline placeholder used when a catalog photo is missing.
 */
function device_showcase_asset(string $category = 'phone'): string
{
    $file = match ($category) {
        'tablet' => 'showcase-tablet.png',
        'watch' => 'showcase-watch.png',
        default => 'showcase-phone.png',
    };
    return asset('assets/img/' . $file);
}
