<?php
// Exercises repository reads against a real in-memory SQLite schema.
declare(strict_types=1);

require_once __DIR__ . '/../src/HttpException.php';
require_once __DIR__ . '/../src/TaskRepository.php';

$pdo = new PDO('sqlite::memory:', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$pdo->exec((string) file_get_contents(__DIR__ . '/../database/schema.sql'));
$repository = new Nexo\TaskRepository($pdo);

$repository->create(['titulo' => 'Relatório 100%', 'prioridade' => 'Alta']);
$repository->create(['titulo' => 'Pauta_reunião', 'prioridade' => 'Baixa']);
$supplier = $repository->create(['titulo' => 'Fornecedores', 'descricao' => 'conferir c\\d', 'prioridade' => 'Media']);
$repository->setStatus((int) $supplier['id'], 'Concluido');

$titles = static fn (array $tasks): array => array_column($tasks, 'titulo');

$priorityRejected = false;
try {
    $repository->search(null, 'Urgente', '');
} catch (Nexo\HttpException $exception) {
    $priorityRejected = $exception->status === 422;
}

$checks = [
    'no filters keeps all() order' => $titles($repository->search(null, null, '')) === $titles($repository->all()),
    'no filters returns 3' => count($repository->search(null, null, '')) === 3,
    'percent is literal (100%)' => $titles($repository->search(null, null, '100%')) === ['Relatório 100%'],
    'bare percent is literal' => count($repository->search(null, null, '%')) === 1,
    'underscore is literal' => $titles($repository->search(null, null, '_')) === ['Pauta_reunião'],
    'backslash is literal' => $titles($repository->search(null, null, 'c\\d')) === ['Fornecedores'],
    'matches description' => $titles($repository->search(null, null, 'conferir')) === ['Fornecedores'],
    'status filter' => $titles($repository->search('Concluido', null, '')) === ['Fornecedores'],
    'priority filter' => $titles($repository->search(null, 'Alta', '')) === ['Relatório 100%'],
    'combined filters, case-insensitive ASCII' => $titles($repository->search('Aberto', 'Baixa', 'pauta')) === ['Pauta_reunião'],
    'invalid priority is 422' => $priorityRejected,
    'counts' => $repository->counts() === ['total' => 3, 'Aberto' => 2, 'Concluido' => 1],
];
try {
    $found = $repository->find((int) $supplier['id']);
    $checks['public find returns the requested task with current status'] =
        $found['id'] === $supplier['id'] && $found['titulo'] === 'Fornecedores'
        && $found['descricao'] === 'conferir c\\d' && $found['prioridade'] === 'Media'
        && $found['status'] === 'Concluido' && $found['criado_em'] === $supplier['criado_em'];
} catch (Throwable) {
    $checks['public find returns the requested task with current status'] = false;
}
foreach ([0, -1, 999999] as $id) {
    $rejected = false;
    try {
        $repository->find($id);
    } catch (Nexo\HttpException $exception) {
        $rejected = $exception->status === 404;
    } catch (Throwable) {
        // Inaccessible methods must fail the check rather than look like a valid 404.
    }
    $checks['public find rejects invalid or missing ID ' . $id . ' with 404'] = $rejected;
}
foreach ($checks as $name => $passed) {
    echo ($passed ? 'PASS ' : 'FAIL ') . $name . "\n";
}
exit(in_array(false, $checks, true) ? 1 : 0);
