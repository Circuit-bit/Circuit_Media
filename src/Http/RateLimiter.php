<?php

declare(strict_types=1);

namespace App\Http;

final class RateLimiter
{
    private static string $dir;

    public static function hit(string $bucket, int $max, int $windowSeconds): ?array
    {
        self::$dir = dirname(__DIR__, 2) . '/data/rate_limits';
        if (!is_dir(self::$dir)) {
            mkdir(self::$dir, 0775, true);
        }
        $key = preg_replace('/[^a-zA-Z0-9_\-.]/', '_', $bucket) ?: 'bucket';
        $file = self::$dir . '/' . $key . '.json';
        $now = time();
        $data = ['window_start' => $now, 'count' => 0];
        if (is_file($file)) {
            $parsed = json_decode((string) file_get_contents($file), true);
            if (is_array($parsed)) {
                $data = $parsed;
            }
        }
        if ($now - (int) $data['window_start'] >= $windowSeconds) {
            $data = ['window_start' => $now, 'count' => 0];
        }
        $data['count'] = (int) $data['count'] + 1;
        file_put_contents($file, json_encode($data));
        if ($data['count'] > $max) {
            return ['error' => 'Rate limit exceeded', 'retry_after' => $windowSeconds - ($now - (int) $data['window_start'])];
        }
        return null;
    }
}
