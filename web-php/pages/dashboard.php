<?php
// Panel controller. The front controller supplies $repository; all persistence stays in TaskRepository.
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
webStartSession();

$routes = [
    '/' => ['GET'],
    '/excluir' => ['GET', 'POST'],
    '/nova' => ['GET', 'POST'],
    '/status' => ['POST'],
];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$input = $method === 'POST' ? $_POST : $_GET;
$filters = ['status' => '', 'prioridade' => '', 'q' => ''];

$fail = static function (int $code, string $message) use (&$filters): void {
    http_response_code($code);
    webRender('error', ['error' => $message, 'backUrl' => webUrl($filters)], 'Visão geral');
};

if (!isset($routes[$path]) || !in_array($method, $routes[$path], true)) {
    if (isset($routes[$path])) {
        header('Allow: ' . implode(', ', $routes[$path]));
        $fail(405, 'Método não permitido.');
    } else {
        $fail(404, 'Página não encontrada.');
    }
    return;
}

try {
    $filters = webFilters($input);
} catch (InvalidArgumentException) {
    $fail(400, 'Filtro inválido. Use as opções do painel para filtrar as tarefas.');
    return;
}

try {
    if ($path === '/excluir') {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($method === 'POST' && !csrfValid()) {
            $fail(403, 'Não foi possível validar a solicitação. Tente novamente.');
        } elseif ($id === false || $id === null) {
            $fail(404, 'Tarefa não encontrada.');
        } elseif ($method === 'POST') {
            $repository->delete($id);
            webRedirect(webUrl($filters), 'Tarefa excluída com sucesso.');
        } else {
            $task = null;
            foreach ($repository->all() as $item) {
                if ((int) $item['id'] === $id) {
                    $task = $item;
                    break;
                }
            }
            if ($task === null) {
                $fail(404, 'Tarefa não encontrada.');
            } else {
                webRender('confirm-delete', ['task' => $task, 'filters' => $filters], 'Confirmar exclusão');
            }
        }
    } elseif ($path === '/nova') {
        $values = ['titulo' => '', 'descricao' => '', 'prioridade' => 'Media'];
        if ($method === 'POST') {
            foreach ($values as $key => $default) {
                $values[$key] = is_string($_POST[$key] ?? null) ? $_POST[$key] : $default;
            }
        }
        $form = static function (int $code, array $errors, ?string $formError) use ($values): void {
            http_response_code($code);
            webRender('task-form', ['values' => $values, 'errors' => $errors, 'formError' => $formError], 'Nova tarefa', 'new');
        };
        if ($method === 'GET') {
            $form(200, [], null);
        } elseif (!csrfValid()) {
            $form(403, [], 'Não foi possível validar a solicitação. Recarregue a página e tente novamente.');
        } else {
            try {
                $repository->create(array_intersect_key($_POST, $values));
                webRedirect('/', 'Tarefa cadastrada.');
            } catch (\Nexo\HttpException $exception) {
                if ($exception->status !== 422) {
                    throw $exception;
                }
                $form(422, $exception->fields, 'Revise os campos indicados.');
            }
        }
    } elseif ($path === '/status') {
        $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $newStatus = $_POST['novo_status'] ?? null;
        if (!csrfValid()) {
            $fail(403, 'Não foi possível validar a solicitação. Tente novamente.');
        } elseif ($id === false || $id === null || !in_array($newStatus, ['Aberto', 'Concluido'], true)) {
            $fail(422, 'Não foi possível alterar o status: dados inválidos.');
        } else {
            $repository->setStatus($id, $newStatus);
            webRedirect(webUrl($filters), $newStatus === 'Concluido' ? 'Tarefa concluída.' : 'Tarefa reaberta.');
        }
    } elseif ($path === '/') {
        webRender('dashboard', [
            'filters' => $filters,
            'tasks' => $repository->search($filters['status'], $filters['prioridade'], $filters['q']),
            'counts' => $repository->counts(),
            'notice' => webTakeNotice(),
        ], 'Visão geral');
    } else {
        $fail(404, 'Página não encontrada.');
    }
} catch (\Nexo\HttpException $exception) {
    $exception->status === 404
        ? $fail(404, 'Tarefa não encontrada.')
        : $fail(500, 'Não foi possível concluir a operação. Tente novamente.');
} catch (\Throwable) {
    $fail(500, 'Não foi possível concluir a operação. Tente novamente.');
}
