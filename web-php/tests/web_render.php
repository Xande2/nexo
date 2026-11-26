<?php
// Exercises the real page with a contract-compatible test repository.
require_once __DIR__ . '/../src/HttpException.php';
final class TestRepository {
    public bool $failSearch = false;
    private array $tasks = [
        ['id'=>1,'titulo'=>'<script>alert(1)</script>','descricao'=>'Descrição','prioridade'=>'Media','status'=>'Aberto','criado_em'=>'2026-11-26T10:00:00Z'],
        ['id'=>2,'titulo'=>'Finalizada','descricao'=>'','prioridade'=>'Alta','status'=>'Concluido','criado_em'=>'2026-11-26T09:00:00Z'],
    ];
    public int $allCalls = 0;
    public function all(?string $status = null): array { $this->allCalls++; return $this->search($status, null, ''); }
    public function find(int $id): array {
        foreach ($this->tasks as $task) { if ($task['id'] === $id) { return $task; } }
        throw new Nexo\HttpException(404, 'Tarefa não encontrada.');
    }
    public function search(?string $status, ?string $prioridade, string $q): array {
        if ($this->failSearch) { throw new RuntimeException('Falha interna'); }
        return array_values(array_filter($this->tasks, static fn (array $t): bool =>
            (!$status || $t['status'] === $status) && (!$prioridade || $t['prioridade'] === $prioridade)
            && ($q === '' || stripos($t['titulo'] . ' ' . $t['descricao'], $q) !== false)));
    }
    public function counts(): array { return ['total' => 2, 'Aberto' => 1, 'Concluido' => 1]; }
    public function delete(int $id): void {}
}
$repository = new TestRepository();

function renderPage(TestRepository $repository, string $uri, array $get): string {
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = $uri;
    $_GET = $get;
    $_POST = [];
    ob_start();
    require __DIR__ . '/../pages/dashboard.php';
    return (string) ob_get_clean();
}

/** @return array{invalid: list<string>, autofocus: list<string>, html: string} */
function renderTaskForm(array $values, array $errors): array {
    ob_start();
    webRender('task-form', ['values' => $values, 'errors' => $errors, 'formError' => null], 'Nova tarefa', 'new');
    $html = (string) ob_get_clean();
    preg_match_all('/<(?:input|textarea)\b[^>]*>/', $html, $matches);
    $result = ['invalid' => [], 'autofocus' => [], 'html' => $html];
    foreach ($matches[0] as $tag) {
        preg_match('/\sname="([^"]+)"/', $tag, $name);
        $key = $name[1] ?? '';
        if (preg_match('/type="radio"[^>]*value="([^"]+)"/', $tag, $radio)) { $key .= ':' . $radio[1]; }
        if (str_contains($tag, ' aria-invalid="true" aria-describedby="' . ($name[1] ?? '') . '-erro"')) { $result['invalid'][] = $key; }
        if (preg_match('/\sautofocus\b/', $tag)) { $result['autofocus'][] = $key; }
    }
    return $result;
}

$html = renderPage($repository, '/?status=Aberto', ['status' => 'Aberto']);
$noResults = renderPage($repository, '/?q=inexistente', ['q' => 'inexistente']);
$notFound = renderPage($repository, '/pagina-inexistente', []);
$notFoundStatus = http_response_code();
$repository->failSearch = true;
$genericError = renderPage($repository, '/', []);
$genericStatus = http_response_code();
$repository->failSearch = false;
$repository->allCalls = 0;
$confirm = renderPage($repository, '/excluir?id=1', ['id' => '1']);
$confirmAllCalls = $repository->allCalls;
$confirmMissing = renderPage($repository, '/excluir?id=99', ['id' => '99']);
$confirmMissingStatus = http_response_code();
$radios = ['prioridade:Baixa', 'prioridade:Media', 'prioridade:Alta'];
$cleanForm = renderTaskForm(['titulo' => '', 'descricao' => '', 'prioridade' => 'Media'], []);
$badPriority = renderTaskForm(['titulo' => 'Válido', 'descricao' => '', 'prioridade' => 'Urgente'], ['prioridade' => '<i>prioridade</i>']);
$badDescription = renderTaskForm(['titulo' => 'Válido', 'descricao' => '<b>x</b>', 'prioridade' => 'Alta'], ['descricao' => 'Descrição longa']);
$allBad = renderTaskForm(['titulo' => '', 'descricao' => 'x', 'prioridade' => 'Urgente'], ['prioridade' => 'p', 'descricao' => 'd', 'titulo' => 't']);
$twoBad = renderTaskForm(['titulo' => 'Válido', 'descricao' => 'x', 'prioridade' => 'Urgente'], ['prioridade' => 'p', 'descricao' => 'd']);
$checks = [
    'escaped title' => str_contains($html, '&lt;script&gt;alert(1)&lt;/script&gt;') && !str_contains($html, '<script>alert(1)</script>'),
    'filtered table' => !str_contains($html, 'Finalizada'),
    'global totals' => preg_match('/Total de tarefas\s*<\/[^>]+>\s*<[^>]+>2</', $html) && preg_match('/Concluídas\s*<\/[^>]+>\s*<[^>]+>1</', $html),
    'confirmation link' => str_contains($html, '/excluir?id=1'),
    'UTC label' => str_contains($html, 'UTC'),
    'status tabs with counts' => (bool) preg_match('/<a[^>]*aria-current="page"[^>]*>\s*Abertas\s*<span[^>]*>1<\/span>/', $html),
    'priority filter select' => str_contains($html, 'name="prioridade"'),
    'search input' => (bool) preg_match('/<input[^>]*type="search"[^>]*name="q"/', $html),
    'cards labels' => str_contains($html, 'data-label="Prioridade"'),
    'new task CTA' => str_contains($html, 'href="/nova"'),
    'toggle form' => (bool) preg_match('/action="\/status"[\s\S]*?name="id" value="1"[\s\S]*?name="novo_status" value="Concluido"/', $html)
        && (bool) preg_match('/name="id" value="2"[\s\S]*?name="novo_status" value="Aberto"/', renderPage($repository, '/', [])),
    'sidebar new task link' => (bool) preg_match('/<nav aria-label="Navegação principal">(?:(?!<\/nav>)[\s\S])*href="\/nova"/', $html),
    'no-results empty state' => str_contains($noResults, 'Limpar filtros') && str_contains($noResults, 'Nenhuma tarefa encontrada'),
    'delete confirmation uses find, not all()' => $confirmAllCalls === 0 && str_contains($confirm, 'Excluir tarefa?') && str_contains($confirm, '&lt;script&gt;alert(1)&lt;/script&gt;'),
    'delete confirmation for missing id is 404' => $confirmMissingStatus === 404 && str_contains($confirmMissing, 'Tarefa não encontrada.'),
    '404 title and heading' => str_contains($notFound, '<title>Página não encontrada | Nexo</title>') && str_contains($notFound, '<h1>Página não encontrada</h1>'),
    '404 status message and return' => $notFoundStatus === 404 && str_contains($notFound, 'Página não encontrada.') && str_contains($notFound, 'href="/"') && str_contains($notFound, 'Voltar para tarefas'),
    'generic error title and heading' => str_contains($genericError, '<title>Algo deu errado | Nexo</title>') && str_contains($genericError, '<h1>Algo deu errado</h1>'),
    'generic error status message and return' => $genericStatus === 500 && str_contains($genericError, 'Não foi possível concluir a operação. Tente novamente.') && !str_contains($genericError, 'Falha interna') && str_contains($genericError, 'href="/"') && str_contains($genericError, 'Voltar para tarefas'),
    'form without errors focuses title' => $cleanForm['autofocus'] === ['titulo'] && $cleanForm['invalid'] === [],
    'invalid priority marks every radio' => $badPriority['invalid'] === $radios && str_contains($badPriority['html'], 'id="prioridade-erro"'),
    'invalid priority focuses first radio only' => $badPriority['autofocus'] === ['prioridade:Baixa'],
    'invalid priority message escaped and values kept' => str_contains($badPriority['html'], '&lt;i&gt;prioridade&lt;/i&gt;') && !str_contains($badPriority['html'], '<i>prioridade</i>') && str_contains($badPriority['html'], 'value="Válido"'),
    'invalid description with valid title focuses description' => $badDescription['autofocus'] === ['descricao'] && $badDescription['invalid'] === ['descricao'],
    'invalid description keeps escaped values' => str_contains($badDescription['html'], '&lt;b&gt;x&lt;/b&gt;</textarea>') && (bool) preg_match('/value="Alta"[^>]*checked/', $badDescription['html']),
    'all fields invalid focuses title' => $allBad['autofocus'] === ['titulo'] && $allBad['invalid'] === ['titulo', 'descricao', ...$radios],
    'description and priority invalid focuses description' => $twoBad['autofocus'] === ['descricao'] && $twoBad['invalid'] === ['descricao', ...$radios],
];
foreach ($checks as $name => $passed) { echo ($passed ? 'PASS ' : 'FAIL ') . $name . "\n"; }
exit(in_array(false, $checks, true) ? 1 : 0);
