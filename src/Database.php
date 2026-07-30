<?php

declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $cfg = $GLOBALS['app_config']['env']['db'] ?? [];
        if (empty($cfg['host']) || ($cfg['enabled'] ?? true) === false) {
            throw new PDOException('Database is disabled', 0);
        }
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $cfg['host'],
            (int) ($cfg['port'] ?? 3306),
            $cfg['name'] ?? '',
            $cfg['charset'] ?? 'utf8mb4'
        );

        try {
            self::$pdo = new PDO($dsn, (string) ($cfg['user'] ?? ''), (string) ($cfg['pass'] ?? ''), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 2,
            ]);
        } catch (PDOException $e) {
            throw new PDOException('Database connection failed: ' . $e->getMessage(), (int) $e->getCode());
        }

        return self::$pdo;
    }

    public static function available(): bool
    {
        $cfg = $GLOBALS['app_config']['env']['db'] ?? [];
        if (empty($cfg['host']) || ($cfg['enabled'] ?? true) === false) {
            return false;
        }
        try {
            self::pdo();
            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
