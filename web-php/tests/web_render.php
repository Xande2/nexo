<?php
// Exercises the real page with a contract-compatible test repository.
final class TestRepository {
    private array $tasks = [
        ['id'=>1,'titulo'=>'<script>alert(1)</script>','descricao'=>'Descrição','prioridade'=>'Media','status'=>'Aberto','criado_em'=>'2026-11-26T10:00:00Z'],
        ['id'=>2,'titulo'=>'Finalizada','descricao'=>'','prioridade'=>'Alta','status'=>'Concluido','criado_em'=>'2026-11-26T09:00:00Z'],
    ];
    public function all(?string $status = null): array { return $this->search($status, null, ''); }
    public function search(?string $status, ?string $prioridade, string $q): array {
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

$html = renderPage($repository, '/?status=Aberto', ['status' => 'Aberto']);
$noResults = renderPage($repository, '/?q=inexistente', ['q' => 'inexistente']);
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
];
foreach ($checks as $name => $passed) { echo ($passed ? 'PASS ' : 'FAIL ') . $name . "\n"; }
exit(in_array(false, $checks, true) ? 1 : 0);
