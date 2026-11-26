<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
ini_set('display_errors', '0');
try {
    // Bootstrap verifies the database configuration and loads the local autoloader.
    require __DIR__ . '/../src/bootstrap.php';
    $config = require __DIR__ . '/../config/app.php';
    $pdo = new PDO('sqlite:' . $config['db_path'], null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec(file_get_contents(__DIR__ . '/schema.sql'));
    fwrite(STDOUT, "Banco inicializado com sucesso.\n");
} catch (Throwable) {
    fwrite(STDERR, "Não foi possível inicializar o banco. Verifique a configuração e as permissões.\n");
    exit(1);
}
