<?php

declare(strict_types=1);

require_once __DIR__ . '/src/bootstrap.php';

use App\Controllers\Api\ApiController;
use App\Controllers\PageController;
use App\Router;

$base = base_path();
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($base !== '' && str_starts_with($uri, $base)) {
    $uri = substr($uri, strlen($base)) ?: '/';
}
$path = '/' . trim((string) $uri, '/');
if ($path !== '/') {
    $path = rtrim($path, '/') ?: '/';
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$router = new Router();

$router->get('/', [PageController::class, 'home']);
$router->get('/devices', [PageController::class, 'devices']);
$router->get('/phones', [PageController::class, 'phones']);
$router->get('/tablets', [PageController::class, 'tablets']);
$router->get('/watches', [PageController::class, 'watches']);
$router->get('/phones/{slug}', [PageController::class, 'phoneDetail']);
$router->get('/tablets/{slug}', [PageController::class, 'tabletDetail']);
$router->get('/watches/{slug}', [PageController::class, 'watchDetail']);
$router->get('/catalog/{id}', [PageController::class, 'catalogDetail']);
$router->get('/brands', [PageController::class, 'brands']);
$router->get('/brands/{slug}', [PageController::class, 'brandDetail']);
$router->get('/search', [PageController::class, 'search']);
$router->get('/compare', [PageController::class, 'compare']);
$router->get('/recommend', [PageController::class, 'recommend']);
$router->get('/news', [PageController::class, 'news']);
$router->get('/news/{slug}', [PageController::class, 'newsDetail']);
$router->get('/reviews', [PageController::class, 'reviews']);
$router->get('/reviews/{slug}', [PageController::class, 'reviewDetail']);
$router->get('/admin', [PageController::class, 'admin']);
$router->get('/about', static fn () => PageController::info('about'));
$router->get('/privacy', static fn () => PageController::info('privacy'));
$router->get('/methodology', static fn () => PageController::info('methodology'));
$router->get('/contact', static fn () => PageController::info('contact'));

$router->get('/api/brands', [ApiController::class, 'brands']);
$router->get('/api/news', [ApiController::class, 'news']);
$router->get('/api/categories', [ApiController::class, 'categories']);
$router->get('/api/devices', [ApiController::class, 'devices']);
$router->get('/api/devices/{slug}', [ApiController::class, 'device']);
$router->get('/api/catalog/{id}', [ApiController::class, 'catalog']);
$router->get('/api/catalog/{id}/images', [ApiController::class, 'catalogImages']);
$router->get('/api/search', [ApiController::class, 'search']);
$router->post('/api/compare', [ApiController::class, 'compare']);
$router->get('/api/recommend', [ApiController::class, 'recommendGet']);
$router->post('/api/recommend', [ApiController::class, 'recommendPost']);
$router->get('/api/reviews/{deviceId}', [ApiController::class, 'reviews']);
$router->post('/api/user-reviews', [ApiController::class, 'userReviewsPost']);
$router->get('/api/prices/{deviceId}', [ApiController::class, 'prices']);
$router->post('/api/ai/summarize', [ApiController::class, 'aiSummarize']);
$router->post('/api/ai/compare', [ApiController::class, 'aiCompare']);
$router->get('/api/admin/import', [ApiController::class, 'adminImportGet']);
$router->post('/api/admin/import', [ApiController::class, 'adminImportPost']);
$router->post('/api/admin/verify', [ApiController::class, 'adminVerify']);

$router->dispatch($method, $path);
