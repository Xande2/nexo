<?php
declare(strict_types=1);

return [
    'db_path' => getenv('NEXO_DB_PATH') !== false ? getenv('NEXO_DB_PATH') : __DIR__ . '/../database/nexo.sqlite',
    'cors_origins' => array_values(array_filter(array_map('trim', explode(',',
        getenv('NEXO_CORS_ORIGINS') !== false
            ? getenv('NEXO_CORS_ORIGINS')
            : 'http://localhost:8081,http://localhost:19006'
    )))),
];
