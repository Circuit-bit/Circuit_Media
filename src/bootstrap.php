<?php

declare(strict_types=1);

$root = dirname(__DIR__);

spl_autoload_register(static function (string $class) use ($root): void {
    if (!str_starts_with($class, 'App\\')) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, 4));
    $file = $root . '/src/' . $relative . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

$GLOBALS['app_config'] = require $root . '/config/config.php';

require_once $root . '/src/helpers.php';

date_default_timezone_set('UTC');
