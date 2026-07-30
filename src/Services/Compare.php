<?php

declare(strict_types=1);

namespace App\Services;

use InvalidArgumentException;
use RuntimeException;

final class Compare
{
    public static function compare(array $deviceIds, array $priorities = []): array
    {
        $ids = array_values(array_unique(array_filter(array_map(
            static fn (mixed $id): string => trim((string) $id),
            $deviceIds
        ))));
        if (count($ids) < 2 || count($ids) > 4) {
            throw new InvalidArgumentException('Choose between 2 and 4 unique devices');
        }

        $devices = [];
        foreach ($ids as $id) {
            // Prefer scored local catalog (handles live-list id drift), then live resolve.
            $device = Catalog::getDevice($id);
            if ($device === null
                || !is_array($device['specifications'] ?? null)
                || count($device['specifications']) < 3) {
                $device = LiveCatalog::resolveLiveDevice($id) ?? $device;
            }
            if ($device === null) {
                throw new RuntimeException("Device not found: {$id}", 404);
            }
            $devices[] = $device;
        }

        return [
            'devices' => $devices,
            'priorities' => array_values(array_unique(array_map('strval', $priorities))),
            'scorecard' => self::scorecard($devices),
            'specifications' => self::specificationRows($devices),
            'recommendation' => self::recommendation($devices, $priorities),
        ];
    }

    public static function sideBySide(array $deviceIds, array $priorities = []): array
    {
        return self::compare($deviceIds, $priorities);
    }

    private static function scorecard(array $devices): array
    {
        $rows = [
            ['key' => 'overall', 'label' => 'Overall score'],
            ['key' => 'performance', 'label' => 'Performance'],
            ['key' => 'display', 'label' => 'Display'],
            ['key' => 'camera', 'label' => 'Camera'],
            ['key' => 'battery', 'label' => 'Battery'],
            ['key' => 'build', 'label' => 'Build'],
        ];
        foreach ($rows as &$row) {
            $values = [];
            foreach ($devices as $device) {
                $id = (string) ($device['id'] ?? '');
                $scores = is_array($device['componentScores'] ?? null) ? $device['componentScores'] : [];
                $values[$id] = $row['key'] === 'overall'
                    ? (isset($device['score']) ? (float) $device['score'] : null)
                    : (isset($scores[$row['key']]) ? (float) $scores[$row['key']] : null);
            }
            $row['values'] = $values;
        }
        unset($row);
        return $rows;
    }

    private static function specificationRows(array $devices): array
    {
        $rows = [];
        foreach ($devices as $device) {
            $deviceId = (string) ($device['id'] ?? '');
            foreach ((array) ($device['specifications'] ?? []) as $group) {
                if (!is_array($group)) {
                    continue;
                }
                $groupName = (string) ($group['name'] ?? 'Specifications');
                foreach ((array) ($group['items'] ?? []) as $item) {
                    if (!is_array($item)) {
                        continue;
                    }
                    $label = (string) ($item['label'] ?? 'Info');
                    $key = strtolower($groupName . "\0" . $label);
                    if (!isset($rows[$key])) {
                        $rows[$key] = ['group' => $groupName, 'label' => $label, 'values' => []];
                    }
                    $rows[$key]['values'][$deviceId] = (string) ($item['value'] ?? '');
                }
            }
        }
        foreach ($rows as &$row) {
            foreach ($devices as $device) {
                $id = (string) ($device['id'] ?? '');
                $row['values'][$id] ??= null;
            }
        }
        unset($row);
        return array_values($rows);
    }

    private static function recommendation(array $devices, array $priorities): array
    {
        if ($priorities === []) {
            return [
                'winner' => null,
                'reason' => 'No winner declared without complete priority-specific evidence',
                'confidence' => 0.4,
            ];
        }
        $priorityMap = [
            'performance' => 'performance',
            'gaming' => 'performance',
            'display' => 'display',
            'media' => 'display',
            'camera' => 'camera',
            'photography' => 'camera',
            'video' => 'camera',
            'battery' => 'battery',
            'build' => 'build',
            'durability' => 'build',
        ];
        $scoreKeys = [];
        foreach ($priorities as $priority) {
            $key = $priorityMap[strtolower((string) $priority)] ?? null;
            if ($key !== null) {
                $scoreKeys[] = $key;
            }
        }
        $scoreKeys = array_values(array_unique($scoreKeys));
        if ($scoreKeys === []) {
            return [
                'winner' => null,
                'reason' => 'The selected priorities do not map to complete scored evidence',
                'confidence' => 0.35,
            ];
        }
        $ranked = [];
        foreach ($devices as $device) {
            $scores = is_array($device['componentScores'] ?? null) ? $device['componentScores'] : [];
            $values = [];
            foreach ($scoreKeys as $key) {
                if (is_numeric($scores[$key] ?? null)) {
                    $values[] = (float) $scores[$key];
                }
            }
            if (count($values) !== count($scoreKeys)) {
                return [
                    'winner' => null,
                    'reason' => 'No winner declared because priority-specific evidence is incomplete',
                    'confidence' => 0.4,
                ];
            }
            $ranked[] = ['device' => $device, 'score' => array_sum($values) / count($values)];
        }
        usort($ranked, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);
        $margin = $ranked[0]['score'] - ($ranked[1]['score'] ?? $ranked[0]['score']);
        if ($margin < 0.25) {
            return [
                'winner' => null,
                'reason' => 'The leading devices are effectively tied for the selected priorities',
                'confidence' => 0.5,
            ];
        }
        $winner = $ranked[0]['device'];
        return [
            'winner' => (string) ($winner['id'] ?? ''),
            'reason' => trim((string) ($winner['brand'] ?? '') . ' ' . (string) ($winner['model'] ?? ''))
                . ' has the strongest average score for ' . implode(', ', $scoreKeys),
            'confidence' => min(0.9, 0.55 + $margin / 10),
        ];
    }
}
