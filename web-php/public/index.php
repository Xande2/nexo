<?php
declare(strict_types=1);

ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');

/** Emit one JSON envelope; empty responses are handled separately. */
function nexoJson(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
}

function nexoInput(): array
{
    $media = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($media !== 'application/json') {
        throw new Nexo\HttpException(415, 'Envie o conteúdo como application/json.');
    }
    try {
        $input = json_decode(file_get_contents('php://input'), false, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new Nexo\HttpException(400, 'JSON inválido. Envie um objeto JSON.');
    }
    if (!$input instanceof stdClass) {
        throw new Nexo\HttpException(400, 'Envie um objeto JSON.');
    }
    return (array) $input;
}

try {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $isApi = is_string($path) && ($path === '/api' || str_starts_with($path, '/api/'));
    if ($isApi) {
        header('Vary: Origin');
        $config = require __DIR__ . '/../config/app.php';
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && in_array($origin, $config['cors_origins'], true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
        }
    }
    $repository = require __DIR__ . '/../src/bootstrap.php';
    if (!$isApi && in_array($path, ['/', '/excluir', '/nova', '/status'], true) && is_file(__DIR__ . '/../pages/dashboard.php')) {
        require __DIR__ . '/../pages/dashboard.php';
        return;
    }
    $collection = $path === '/api/chamados';
    $id = null;
    if (is_string($path) && preg_match('~\A/api/chamados/([1-9][0-9]*)\z~', $path, $matches)) {
        $id = filter_var($matches[1], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    }
    if (!$collection && ($id === null || $id === false)) {
        throw new Nexo\HttpException(404, 'Rota não encontrada.');
    }
    $allow = $collection ? 'GET,POST,OPTIONS' : 'PATCH,DELETE,OPTIONS';
    if ($method === 'OPTIONS') {
        header('Allow: GET,POST,PATCH,DELETE,OPTIONS');
        http_response_code(204);
        return;
    }
    if (!in_array($method, explode(',', $allow), true)) {
        header('Allow: ' . $allow);
        throw new Nexo\HttpException(405, 'Método não permitido.');
    }
    if ($collection && $method === 'GET') {
        $status = $_GET['status'] ?? null;
        if ($status !== null && !is_string($status)) {
            throw new Nexo\HttpException(422, 'Status inválido.', ['status' => 'Informe um status em texto.']);
        }
        nexoJson(200, ['data' => $repository->all($status)]);
    } elseif ($collection && $method === 'POST') {
        nexoJson(201, ['data' => $repository->create(nexoInput())]);
    } elseif ($method === 'PATCH') {
        $input = nexoInput();
        if (!isset($input['status']) || !is_string($input['status'])) {
            throw new Nexo\HttpException(422, 'Status obrigatório.', ['status' => 'Informe Aberto ou Concluido.']);
        }
        nexoJson(200, ['data' => $repository->setStatus($id, $input['status'])]);
    } elseif ($method === 'DELETE') {
        $repository->delete($id);
        http_response_code(204);
    }
} catch (Nexo\HttpException $exception) {
    nexoJson($exception->status, ['error' => [
        'message' => $exception->getMessage(), 'fields' => (object) $exception->fields,
    ]]);
} catch (Throwable) {
    nexoJson(500, ['error' => [
        'message' => 'Não foi possível processar a solicitação. Tente novamente.', 'fields' => (object) [],
    ]]);
}
