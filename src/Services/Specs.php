<?php

declare(strict_types=1);

namespace App\Services;

final class Specs
{
    public static function cleanHtml(?string $value): string
    {
        if (!$value) {
            return '';
        }

        $value = preg_replace('/<[^>]+>/', ' ', $value) ?? $value;
        $value = str_replace(
            ['&nbsp;', '&amp;', '&quot;'],
            [' ', '&', '"'],
            $value
        );
        $value = preg_replace('/&#\d+;/', ' ', $value) ?? $value;
        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }

    public static function extractFeatures(array $seedDevice): array
    {
        $specs = is_array($seedDevice['specifications'] ?? null) ? $seedDevice['specifications'] : [];

        $displayType = self::specText($specs, 'Display', 'Type');
        $displaySize = self::specText($specs, 'Display', 'Size');
        $displayResolution = self::specText($specs, 'Display', 'Resolution');
        $displayAll = "{$displayType} {$displaySize} {$displayResolution}";

        $batteryType = self::specText($specs, 'Battery', 'Type')
            ?: (string) ($seedDevice['storage'] ?? '');
        $charging = self::specText($specs, 'Battery', 'Charging');
        $chipset = self::specText($specs, 'Platform', 'Chipset');
        $releaseYear = self::parseReleaseYear($seedDevice);

        $memoryInternal = self::specText($specs, 'Memory', 'Internal')
            ?: self::cleanHtml(self::stringOrNull($seedDevice['storage'] ?? null));
        $maxRamGb = null;
        $maxStorageGb = null;
        preg_match_all(
            '/(\d+(?:\.\d+)?)(GB|TB)\s+(\d+(?:\.\d+)?)(GB|TB)\s+RAM/i',
            $memoryInternal,
            $memoryMatches,
            PREG_SET_ORDER
        );
        foreach ($memoryMatches as $match) {
            $storage = self::toGb((float) $match[1], $match[2]);
            $ram = self::toGb((float) $match[3], $match[4]);
            $maxStorageGb = $maxStorageGb === null ? $storage : max($maxStorageGb, $storage);
            $maxRamGb = $maxRamGb === null ? $ram : max($maxRamGb, $ram);
        }
        if ($maxStorageGb === null) {
            $solo = self::maxNumber($memoryInternal, '/(\d+)GB/i');
            $tb = self::maxNumber($memoryInternal, '/(\d+)TB/i');
            $maxStorageGb = $tb ? $tb * 1024 : $solo;
        }

        $mainCameraSection = self::section($specs, 'Main Camera');
        if ($mainCameraSection === []) {
            $mainCameraSection = self::section($specs, 'Main camera');
        }
        $mainCameraKeys = array_map('strtolower', array_keys($mainCameraSection));
        $lensCount = in_array('penta', $mainCameraKeys, true) ? 5
            : (in_array('quad', $mainCameraKeys, true) ? 4
            : (in_array('triple', $mainCameraKeys, true) ? 3
            : ((in_array('dual', $mainCameraKeys, true) || in_array('dual or triple', $mainCameraKeys, true)) ? 2
            : (in_array('single', $mainCameraKeys, true) ? 1 : 0))));

        $mainCameraText = self::allText($specs, 'Main Camera') ?: self::allText($specs, 'Main camera');
        $selfieText = self::allText($specs, 'Selfie camera') ?: self::allText($specs, 'Selfie Camera');
        $bodyText = self::allText($specs, 'Body');
        $commsText = self::allText($specs, 'Comms');
        $soundText = self::allText($specs, 'Sound');
        $networkText = self::allText($specs, 'Network');
        $featuresText = self::allText($specs, 'Features');
        $miscSection = self::section($specs, 'Misc');

        $dimensions = self::cleanHtml(self::stringOrNull($seedDevice['dimensions'] ?? null)) ?: $bodyText;
        $weightGrams = self::firstNumber($bodyText, '/(\d+(?:\.\d+)?)\s*g\b/')
            ?? self::firstNumber($dimensions, '/(\d+(?:\.\d+)?)\s*g\b/');
        $thicknessMm = self::firstNumber(
            self::cleanHtml(self::stringOrNull($seedDevice['dimensions'] ?? null)),
            '/(\d+(?:\.\d+)?)\s*mm/'
        ) ?? self::firstNumber($bodyText, '/x\s+(\d+(?:\.\d+)?)\s*mm/');

        preg_match('/IP[X0-9]{2}[A-Z]?(?:\/IP[X0-9]{2}[A-Z]?)*/i', "{$bodyText} {$featuresText}", $ipMatch);
        preg_match('/\b(\d+)\s?ATM\b/i', "{$bodyText} {$featuresText}", $atmMatch);
        $ipRating = isset($ipMatch[0]) ? strtoupper($ipMatch[0])
            : (isset($atmMatch[1]) ? $atmMatch[1] . 'ATM' : null);

        $priceUsd = self::parsePriceUsd((string) ($miscSection['Price'] ?? ''));
        $colors = array_values(array_filter(
            array_map('trim', explode(',', self::cleanHtml(self::stringOrNull($miscSection['Colors'] ?? null)))),
            static fn (string $color): bool => $color !== ''
        ));
        $osText = self::specText($specs, 'Platform', 'OS')
            ?: self::cleanHtml(self::stringOrNull($seedDevice['os'] ?? null));

        return [
            'releaseYear' => $releaseYear,
            'announced' => self::specText($specs, 'Launch', 'Announced'),
            'status' => self::specText($specs, 'Launch', 'Status'),
            'displayInches' => self::firstNumber($displaySize, '/(\d+(?:\.\d+)?)\s*inches/'),
            'displayPanel' => preg_match('/amoled|oled|super retina|dynamic amoled|ltpo/i', $displayType)
                ? 'OLED'
                : (preg_match('/ips|lcd|tft|pls/i', $displayType)
                    ? 'LCD'
                    : ((explode(',', $displayType)[0] ?? '') ?: 'Unknown')),
            'isOled' => (bool) preg_match('/amoled|oled|super retina/i', $displayType),
            'refreshHz' => self::maxNumber($displayAll, '/(\d+)Hz/i'),
            'ppi' => self::firstNumber($displayResolution, '/~?(\d+)\s*ppi/'),
            'brightnessNits' => self::maxNumber($displayType, '/(\d+)\s*nits/i'),
            'batteryMah' => self::firstNumber(self::cleanHtml($batteryType), '/(\d[\d,]{2,})\s*mAh/'),
            'chargeWatts' => self::maxNumber($charging, '/(\d+(?:\.\d+)?)W/i'),
            'wirelessCharging' => (bool) preg_match('/wireless|magsafe|qi/i', $charging),
            'chipset' => $chipset,
            'chipsetScore' => self::chipsetTier($chipset, $releaseYear),
            'maxRamGb' => $maxRamGb,
            'maxStorageGb' => $maxStorageGb,
            'cardSlot' => !preg_match('/^no/i', self::specText($specs, 'Memory', 'Card slot') ?: 'no'),
            'mainCameraMp' => self::firstNumber($mainCameraText, '/(\d+(?:\.\d+)?)\s*MP/i'),
            'lensCount' => $lensCount,
            'hasTelephoto' => (bool) preg_match('/telephoto|periscope/i', $mainCameraText),
            'hasPeriscope' => (bool) preg_match('/periscope/i', $mainCameraText),
            'hasUltrawide' => (bool) preg_match('/ultrawide|ultra wide/i', $mainCameraText),
            'hasOis' => (bool) preg_match('/\bois\b|optical image stabili[sz]|sensor-shift/i', $mainCameraText),
            'maxVideo' => preg_match('/8k/i', $mainCameraText) ? '8K'
                : (preg_match('/4k/i', $mainCameraText) ? '4K'
                : (preg_match('/1080p/i', $mainCameraText) ? '1080p' : '')),
            'selfieMp' => self::firstNumber($selfieText, '/(\d+(?:\.\d+)?)\s*MP/i'),
            'weightGrams' => $weightGrams,
            'thicknessMm' => $thicknessMm,
            'ipRating' => $ipRating,
            'waterResistant' => $ipRating !== null && (bool) preg_match('/IP6[7-9]|IP68|IP69|ATM/i', $ipRating),
            'premiumBuild' => (bool) preg_match('/titanium|ceramic|stainless steel|sapphire/i', $bodyText),
            'has5g' => str_contains($networkText, '5G'),
            'hasNfc' => (bool) preg_match('/nfc[^:]*:?\s*(?!no\b)/i', $commsText)
                && !preg_match('/NFC:?\s*No\b/i', $commsText)
                && (bool) preg_match('/nfc/i', $commsText),
            'hasJack' => (bool) preg_match('/3\.5mm jack:?\s*Yes/i', $soundText),
            'hasEsim' => (bool) preg_match('/esim/i', $bodyText),
            'hasGps' => (bool) preg_match('/gps|positioning:?\s*(?!no\b)/i', $commsText)
                && !preg_match('/positioning:?\s*No\b/i', $commsText),
            'os' => $osText,
            'sensors' => self::specText($specs, 'Features', 'Sensors'),
            'stylusSupport' => (bool) preg_match(
                '/stylus|s pen|pencil/i',
                "{$featuresText} " . ($miscSection['Models'] ?? '') . " {$bodyText}"
            ),
            'priceUsd' => $priceUsd,
            'colors' => $colors,
            'models' => self::cleanHtml(self::stringOrNull($miscSection['Models'] ?? null)),
            'variants' => self::parseVariants($memoryInternal),
        ];
    }

    private static function specText(array $specs, string $group, string ...$labels): string
    {
        $section = self::section($specs, $group);
        if ($section === []) {
            return '';
        }
        if ($labels === []) {
            return self::cleanHtml(implode("\n", array_map('strval', array_values($section))));
        }
        foreach ($labels as $label) {
            foreach ($section as $candidate => $value) {
                if (strcasecmp((string) $candidate, $label) === 0 && $value) {
                    return self::cleanHtml(self::stringOrNull($value));
                }
            }
        }
        return '';
    }

    private static function allText(array $specs, string $group): string
    {
        $section = self::section($specs, $group);
        $lines = [];
        foreach ($section as $label => $value) {
            $lines[] = "{$label}: {$value}";
        }
        return self::cleanHtml(implode("\n", $lines));
    }

    private static function section(array $specs, string $group): array
    {
        return is_array($specs[$group] ?? null) ? $specs[$group] : [];
    }

    private static function firstNumber(string $text, string $pattern): ?float
    {
        if (!preg_match($pattern, $text, $match)) {
            return null;
        }
        $parsed = (float) str_replace(',', '', $match[1]);
        return is_finite($parsed) ? $parsed : null;
    }

    private static function maxNumber(string $text, string $pattern): ?float
    {
        preg_match_all($pattern, $text, $matches);
        $best = null;
        foreach ($matches[1] ?? [] as $match) {
            $parsed = (float) str_replace(',', '', $match);
            if (is_finite($parsed) && ($best === null || $parsed > $best)) {
                $best = $parsed;
            }
        }
        return $best;
    }

    private static function chipsetTier(string $chipset, ?int $releaseYear): int
    {
        $c = strtolower($chipset);
        if ($c === '') {
            return 30;
        }
        $table = [
            ['/apple m[4-9]/', 100], ['/apple m[1-3]/', 92],
            ['/a19 pro/', 100], ['/a19\b/', 96], ['/a18 pro/', 95], ['/a18\b/', 90], ['/a17 pro/', 88], ['/a1[56]\b|a16 bionic|a15 bionic/', 82], ['/a14 bionic/', 74], ['/a13 bionic/', 68],
            ['/snapdragon 8 elite gen [2-9]|snapdragon 8 elite 2/', 100], ['/snapdragon 8 elite/', 97], ['/snapdragon 8 gen 3/', 90], ['/snapdragon 8s gen 4/', 85], ['/snapdragon 8 gen 2/', 84], ['/snapdragon 8s gen 3/', 80], ['/snapdragon 8\+ gen 1/', 78], ['/snapdragon 8 gen 1/', 74],
            ['/snapdragon 7\+ gen 3/', 76], ['/snapdragon 7 gen 3/', 66], ['/snapdragon 7s gen [23]/', 62], ['/snapdragon 6 gen [1-9]/', 52], ['/snapdragon 4 gen [1-9]/', 42],
            ['/snapdragon 888/', 70], ['/snapdragon 87[08]/', 68], ['/snapdragon 86[05]/', 64], ['/snapdragon 78[0-9]g?|snapdragon 77[08]g?/', 58], ['/snapdragon 7[0-3][0-9]g?/', 52], ['/snapdragon 6[0-9][0-9]/', 45], ['/snapdragon 4[0-9][0-9]/', 38],
            ['/dimensity 9[45]00/', 96], ['/dimensity 9300/', 90], ['/dimensity 9200/', 84], ['/dimensity 9000/', 78], ['/dimensity 8[34]00/', 74], ['/dimensity 8[12]00/', 68], ['/dimensity 7[0-9]{3}/', 58], ['/dimensity 6[0-9]{3}/', 48], ['/dimensity (10[0-9]{2}|11[0-9]{2}|12[0-9]{2})/', 56],
            ['/exynos 2[45]00/', 88], ['/exynos 2200/', 76], ['/exynos 2100/', 72], ['/exynos 1[45][0-9]{2}/', 60], ['/exynos 13[0-9]{2}/', 52], ['/exynos 12[0-9]{2}/', 46], ['/exynos 9[0-9]{2}/', 40], ['/exynos w1000/', 55], ['/exynos w9[23]0/', 45],
            ['/tensor g[56]/', 84], ['/tensor g4/', 80], ['/tensor g3/', 74], ['/tensor g2/', 68], ['/tensor\b/', 62],
            ['/kirin 9[0-9]{3}/', 80], ['/kirin 8[0-9]{3}/', 62],
            ['/apple s1[0-9]|apple s9/', 70], ['/apple s[678]/', 55],
            ['/snapdragon w5\+? gen [12]/', 60], ['/sw5100/', 55],
            ['/helio g[89][0-9]{1,2}/', 44], ['/helio g[0-7][0-9]/', 36], ['/helio p/', 32], ['/helio a/', 26],
            ['/unisoc t[89][0-9]{2}/', 42], ['/unisoc t[67][0-9]{2}/', 34], ['/unisoc/', 28],
        ];
        foreach ($table as [$pattern, $score]) {
            if (preg_match($pattern, $c)) {
                return $score;
            }
        }

        $nm = self::firstNumber($c, '/\((\d+(?:\.\d+)?)\s*nm\)/');
        $base = 35;
        if ($nm !== null) {
            $base = $nm <= 3 ? 82 : ($nm <= 4 ? 72 : ($nm <= 5 ? 62 : ($nm <= 7 ? 52 : ($nm <= 12 ? 42 : 32))));
        }
        if ($releaseYear !== null && $releaseYear >= 2024) {
            $base += 4;
        }
        return min($base, 100);
    }

    private static function parsePriceUsd(string $rawPrice): ?int
    {
        $price = self::cleanHtml($rawPrice);
        if ($price === '') {
            return null;
        }
        if (preg_match('/\$\s?([\d,]+(?:\.\d+)?)/', $price, $match)) {
            return (int) round((float) str_replace(',', '', $match[1]));
        }
        if (preg_match('/(?:€\s?|About\s+)([\d,]+(?:\.\d+)?)\s*(?:EUR|€)?/i', $price, $match)
            && preg_match('/eur|€/i', $price)) {
            return (int) round((float) str_replace(',', '', $match[1]) * 1.1);
        }
        if (preg_match('/₹\s?([\d,]+)/u', $price, $match)) {
            return (int) round((float) str_replace(',', '', $match[1]) * 0.012);
        }
        return null;
    }

    private static function parseReleaseYear(array $device): ?int
    {
        $specs = is_array($device['specifications'] ?? null) ? $device['specifications'] : [];
        $sources = [
            self::specText($specs, 'Launch', 'Announced'),
            (string) ($device['releaseDate'] ?? ''),
            self::specText($specs, 'Launch', 'Status'),
        ];
        foreach ($sources as $text) {
            if (preg_match('/\b(20[0-3][0-9])\b/', $text, $match)) {
                return (int) $match[1];
            }
        }
        return null;
    }

    private static function parseVariants(string $internal): array
    {
        $variants = [];
        preg_match_all('/(\d+(?:GB|TB))\s+(\d+(?:GB|TB))\s+RAM/i', $internal, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $variants[$match[1] . ' / ' . $match[2] . ' RAM'] = true;
        }
        if ($variants === [] && $internal !== '') {
            preg_match_all('/\d+(?:GB|TB)/i', $internal, $matches);
            foreach ($matches[0] ?? [] as $match) {
                $variants[$match] = true;
            }
        }
        return array_slice(array_keys($variants), 0, 8);
    }

    private static function toGb(float $value, string $unit): float
    {
        return preg_match('/tb/i', $unit) ? $value * 1024 : $value;
    }

    private static function stringOrNull(mixed $value): ?string
    {
        return is_scalar($value) ? (string) $value : null;
    }
}
