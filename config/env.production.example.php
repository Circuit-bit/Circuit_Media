<?php
/**
 * Production defaults for InfinityFree / shared hosting.
 * Copy to env.php on the server and fill MySQL + site URL from your control panel.
 */
return [
    'db' => [
        'host' => 'sqlXXX.infinityfree.com', // from MySQL details in control panel
        'port' => 3306,
        'name' => 'if0_XXXXX_circuit',      // your DB name
        'user' => 'if0_XXXXX',              // your DB user
        'pass' => 'YOUR_DB_PASSWORD',
        'charset' => 'utf8mb4',
    ],
    // Example: https://your-subdomain.infinityfreeapp.com
    'site_url' => 'https://YOUR-DOMAIN',
    // Use '' when the site lives at the domain root (htdocs/).
    // Use '/folder' only if you uploaded into a subdirectory.
    'base_path' => '',
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
    'admin_api_token' => 'change-me-admin-token',
];
