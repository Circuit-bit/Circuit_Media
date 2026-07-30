<?php

declare(strict_types=1);

namespace App\Http;

final class AdminAuth
{
    public static function requireToken(): ?array
    {
        $expected = (string) ($GLOBALS['app_config']['env']['admin_api_token'] ?? '');
        $got = Request::bearerToken();
        if ($expected === '' || $got === null || !hash_equals($expected, $got)) {
            return ['error' => 'Unauthorized', 'status' => 401];
        }
        return null;
    }
}
