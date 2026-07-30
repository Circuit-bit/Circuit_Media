<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;
use Throwable;

final class AiClient
{
    public static function summarize(array $device): array
    {
        $sourceIds = array_values(array_filter(array_map(
            static fn (array $source): string => (string) ($source['id'] ?? ''),
            is_array($device['sources'] ?? null) ? $device['sources'] : []
        )));
        $facts = self::facts($device);
        $name = trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? ''));
        $fallback = self::fallbackSummary($device, $sourceIds);
        return self::generate([
            'name' => $name ?: 'This device',
            'sourceIds' => $sourceIds,
            'verifiedFacts' => $facts,
            'instruction' => 'Summarize this device using only supplied facts.',
        ], $fallback, $sourceIds);
    }

    public static function compare(array $devices, array $priorities = []): array
    {
        $sourceIds = [];
        $verifiedFacts = [];
        foreach ($devices as $device) {
            foreach ((array) ($device['sources'] ?? []) as $source) {
                if (is_array($source) && !empty($source['id'])) {
                    $sourceIds[] = (string) $source['id'];
                }
            }
            $verifiedFacts[] = [
                'name' => trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? '')),
                'facts' => self::facts($device),
            ];
        }
        $sourceIds = array_values(array_unique($sourceIds));
        $names = array_map(static fn (array $device): string =>
            trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? '')), $devices);
        $fallback = self::fallbackComparison($devices, $priorities, $sourceIds);
        return self::generate([
            'name' => implode(' vs ', $names),
            'priorities' => array_values($priorities),
            'sourceIds' => $sourceIds,
            'verifiedFacts' => $verifiedFacts,
            'instruction' => 'Compare supplied devices. Do not declare a winner when evidence is insufficient.',
        ], $fallback, $sourceIds);
    }

    public static function createStructuredSummary(array $input, string $requestId = ''): array
    {
        $sourceIds = array_values(array_filter(
            is_array($input['sourceIds'] ?? null) ? $input['sourceIds'] : [],
            'is_string'
        ));
        $fallback = [
            'summary' => (string) ($input['name'] ?? 'This device')
                . ' is presented from sourced catalog fields. Configure an AI provider for an expanded evidence summary.',
            'pros' => [],
            'cons' => [],
            'best_for' => [],
            'not_recommended_for' => [],
            'confidence' => 0.55,
            'used_source_ids' => $sourceIds,
            'missing_information' => ['Live AI provider not configured'],
            'conflicting_information' => [],
        ];
        return self::generate($input, $fallback, $sourceIds, $requestId);
    }

    private static function generate(
        array $input,
        array $fallback,
        array $allowedSourceIds,
        string $requestId = ''
    ): array {
        $endpoint = trim((string) \app_config('env.ai_api_url', ''));
        $key = trim((string) \app_config('env.ai_api_key', ''));
        if ($endpoint === '' || $key === '') {
            return $fallback;
        }
        try {
            $payload = self::chat($endpoint, $key, [
                'model' => (string) \app_config('env.ai_model', 'provider-default'),
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.1,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Return only JSON with fields summary, pros, cons, best_for, not_recommended_for, confidence, used_source_ids, missing_information, conflicting_information. Use only supplied verified facts and source IDs.',
                    ],
                    ['role' => 'user', 'content' => json_encode($input, JSON_UNESCAPED_SLASHES)],
                ],
            ], $requestId ?: \cuid());
            $content = $payload['choices'][0]['message']['content'] ?? null;
            if (!is_string($content) || $content === '') {
                throw new RuntimeException('AI provider returned no content');
            }
            $result = json_decode($content, true);
            if (!is_array($result)) {
                throw new RuntimeException('AI provider returned invalid JSON');
            }
            return self::validate($result, $allowedSourceIds);
        } catch (Throwable) {
            $fallback['missing_information'] = array_values(array_unique(array_merge(
                (array) ($fallback['missing_information'] ?? []),
                ['AI provider response unavailable']
            )));
            return $fallback;
        }
    }

    private static function chat(string $endpoint, string $key, array $body, string $requestId): array
    {
        $curl = curl_init($endpoint);
        if ($curl === false) {
            throw new RuntimeException('Unable to initialize cURL');
        }
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'Authorization: Bearer ' . $key,
                'X-Request-ID: ' . $requestId,
            ],
            CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_SLASHES),
        ]);
        $raw = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($raw) || $status < 200 || $status >= 300) {
            throw new RuntimeException($error ?: "AI provider returned {$status}");
        }
        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            throw new RuntimeException('AI provider returned invalid JSON');
        }
        return $payload;
    }

    private static function validate(array $result, array $allowedSourceIds): array
    {
        $arrayFields = [
            'pros', 'cons', 'best_for', 'not_recommended_for', 'used_source_ids',
            'missing_information', 'conflicting_information',
        ];
        foreach ($arrayFields as $field) {
            if (!is_array($result[$field] ?? null)) {
                throw new RuntimeException("AI field {$field} must be an array");
            }
        }
        if (!is_string($result['summary'] ?? null) || !is_numeric($result['confidence'] ?? null)) {
            throw new RuntimeException('AI response has invalid scalar fields');
        }
        foreach ($result['used_source_ids'] as $sourceId) {
            if (!is_string($sourceId) || !in_array($sourceId, $allowedSourceIds, true)) {
                throw new RuntimeException('AI referenced an unknown source');
            }
        }
        $result['confidence'] = max(0.0, min(1.0, (float) $result['confidence']));
        return $result;
    }

    private static function fallbackSummary(array $device, array $sourceIds): array
    {
        $name = trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? ''));
        $summary = trim((string) ($device['summary'] ?? ''));
        if ($summary === '') {
            $summary = ($name ?: 'This device') . ' is described using its sourced specification record.';
        }
        return [
            'summary' => $summary,
            'pros' => array_slice((array) ($device['pros'] ?? []), 0, 5),
            'cons' => array_slice((array) ($device['cons'] ?? []), 0, 4),
            'best_for' => array_slice((array) ($device['bestFor'] ?? []), 0, 3),
            'not_recommended_for' => array_slice((array) ($device['cons'] ?? []), 0, 2),
            'confidence' => 0.72,
            'used_source_ids' => $sourceIds,
            'missing_information' => self::missingInformation($device),
            'conflicting_information' => [],
        ];
    }

    private static function fallbackComparison(array $devices, array $priorities, array $sourceIds): array
    {
        $descriptions = [];
        $pros = [];
        $cons = [];
        $bestFor = [];
        foreach ($devices as $device) {
            $name = trim((string) ($device['brand'] ?? '') . ' ' . (string) ($device['model'] ?? ''));
            $descriptions[] = $name . ' scores ' . number_format((float) ($device['score'] ?? 0), 1)
                . '/10' . (!empty($device['bestFor'][0]) ? ' and is best suited to ' . $device['bestFor'][0] : '');
            if (!empty($device['pros'][0])) {
                $pros[] = $name . ': ' . $device['pros'][0];
            }
            if (!empty($device['cons'][0])) {
                $cons[] = $name . ': ' . $device['cons'][0];
            }
            foreach ((array) ($device['bestFor'] ?? []) as $tag) {
                $bestFor[] = $name . ' for ' . $tag;
            }
        }
        $priorityText = $priorities !== [] ? ' Priorities considered: ' . implode(', ', $priorities) . '.' : '';
        return [
            'summary' => implode('; ', $descriptions) . '.' . $priorityText
                . ' No winner is declared without complete priority-specific evidence.',
            'pros' => $pros,
            'cons' => $cons,
            'best_for' => array_slice($bestFor, 0, 8),
            'not_recommended_for' => $cons,
            'confidence' => 0.62,
            'used_source_ids' => $sourceIds,
            'missing_information' => ['Priority-specific measured testing'],
            'conflicting_information' => [],
        ];
    }

    private static function facts(array $device): array
    {
        $facts = [];
        foreach ((array) ($device['specifications'] ?? []) as $group) {
            if (!is_array($group)) {
                continue;
            }
            foreach ((array) ($group['items'] ?? []) as $item) {
                if (!is_array($item) || ($item['status'] ?? 'verified') !== 'verified') {
                    continue;
                }
                $facts[] = [
                    'group' => (string) ($group['name'] ?? ''),
                    'label' => (string) ($item['label'] ?? ''),
                    'value' => (string) ($item['value'] ?? ''),
                    'sourceId' => (string) ($item['sourceId'] ?? 'catalog'),
                ];
            }
        }
        return $facts;
    }

    private static function missingInformation(array $device): array
    {
        $missing = [];
        if (($device['startingPrice'] ?? null) === null) {
            $missing[] = 'Confirmed regional pricing';
        }
        if (($device['componentScores'] ?? null) === null) {
            $missing[] = 'Complete scored specifications';
        }
        return $missing;
    }
}
