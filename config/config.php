<?php

declare(strict_types=1);

$envFile = __DIR__ . '/env.php';
if (!is_file($envFile)) {
    $envFile = __DIR__ . '/env.example.php';
}

/** @var array<string, mixed> $env */
$env = require $envFile;

return [
    'env' => $env,
    'site' => [
        'name' => 'Circuit Media',
        'shortName' => 'CM',
        'tagline' => 'Real Context. Smarter Tech Choices.',
        'description' => 'Smartphone, tech review and community — clear specs, honest reviews, and explainable comparisons for phones, tablets, and watches.',
        'logo' => 'assets/img/circuit-media-mark.png',
        'accent' => '#FF7A3D',
        'contactEmail' => 'hello@circuit-media-review.com',
        'navigation' => [
            ['label' => 'Devices', 'href' => '/devices'],
            ['label' => 'News', 'href' => '/news'],
            ['label' => 'Brands', 'href' => '/brands'],
            ['label' => 'Recommend', 'href' => '/recommend'],
            ['label' => 'Compare', 'href' => '/compare'],
        ],
    ],
];
