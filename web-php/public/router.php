<?php
declare(strict_types=1);

// Only known static formats under the real assets directory may bypass the front controller.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (is_string($path)) {
    $decoded = rawurldecode($path);
    $segments = explode('/', $decoded);
    if (str_starts_with($decoded, '/assets/') && !str_contains($decoded, "\0")
        && !str_contains($decoded, '\\')
        && !array_filter($segments, static fn (string $part): bool => str_starts_with($part, '.'))) {
        $assets = realpath(__DIR__ . '/assets');
        $file = realpath(__DIR__ . $decoded);
        $extension = strtolower(pathinfo($decoded, PATHINFO_EXTENSION));
        $realExtension = $file !== false ? strtolower(pathinfo($file, PATHINFO_EXTENSION)) : '';
        $formats = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'woff', 'woff2', 'ttf'];
        if ($assets !== false && $file !== false && is_file($file)
            && str_starts_with($file, $assets . '/')
            && in_array($extension, $formats, true) && in_array($realExtension, $formats, true)) {
            return false;
        }
    }
}
require __DIR__ . '/index.php';
