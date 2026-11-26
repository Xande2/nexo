<?php
declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'Nexo\\';
    if (str_starts_with($class, $prefix)) {
        $name = substr($class, strlen($prefix));
        if (preg_match('/\A[A-Za-z][A-Za-z0-9]*\z/', $name)) {
            $file = __DIR__ . '/' . $name . '.php';
            if (is_file($file)) {
                require_once $file;
            }
        }
    }
});

return (static function (): Nexo\TaskRepository {
    $config = require __DIR__ . '/../config/app.php';
    $path = $config['db_path'];
    $parent = realpath(dirname($path));
    $public = realpath(__DIR__ . '/../public');
    $resolved = realpath($path) ?: ($parent !== false ? $parent . '/' . basename($path) : false);
    if (!str_starts_with($path, '/') || $resolved === false || $public === false
        || $resolved === $public || str_starts_with($resolved, $public . '/')) {
        throw new RuntimeException('Configuração de banco inválida.');
    }
    $pdo = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_STRINGIFY_FETCHES => false,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    return new Nexo\TaskRepository($pdo);
})();
