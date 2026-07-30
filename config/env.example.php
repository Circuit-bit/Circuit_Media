<?php
/**
 * Copy to config/env.php and adjust for your environment.
 * XAMPP defaults below work out of the box.
 */
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'circuit_media',
        'user' => 'root',
        'pass' => '',
        'charset' => 'utf8mb4',
    ],
    'site_url' => 'http://localhost/Circut_Media_Review_Website_php',
    'base_path' => '/Circut_Media_Review_Website_php',
    'specs_api_url' => 'https://mobile-specs-api-sandy.vercel.app',
    'device_api_url' => 'https://api.mobileapi.dev',
    'device_api_key' => '',
    'image_api_url' => '',
    'image_api_key' => '',
    'price_api_url' => '',
    'price_api_key' => '',
    'review_api_url' => '',
    'review_api_key' => '',
    'benchmark_api_url' => '',
    'benchmark_api_key' => '',
    'ai_api_url' => '',
    'ai_api_key' => '',
    'ai_model' => 'gpt-4o-mini',
        'news_feeds' => [
        ['name' => 'The Verge', 'url' => 'https://www.theverge.com/rss/index.xml'],
        ['name' => 'Android Authority', 'url' => 'https://www.androidauthority.com/feed/'],
        ['name' => '9to5Google', 'url' => 'https://9to5google.com/feed/'],
        ['name' => 'Engadget', 'url' => 'https://www.engadget.com/rss.xml'],
        ['name' => 'GSMArena', 'url' => 'https://www.gsmarena.com/rss-news-reviews.php'],
    ],
    'admin_api_token' => 'change-me-admin-token',
];
