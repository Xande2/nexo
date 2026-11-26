<?php
/**
 * @var array{status:string, prioridade:string, q:string} $filters
 * @var array<int, array<string, mixed>> $tasks
 * @var array{total:int, Aberto:int, Concluido:int} $counts
 * @var ?string $notice
 */
declare(strict_types=1);
$tabs = [
    '' => ['Todas', $counts['total']],
    'Aberto' => ['Abertas', $counts['Aberto']],
    'Concluido' => ['Concluídas', $counts['Concluido']],
];
$donePercent = $counts['total'] > 0 ? (int) round($counts['Concluido'] / $counts['total'] * 100) : null;
$found = count($tasks);
?>
<header class="page-header">
    <div>
        <p class="eyebrow">Painel de tarefas</p>
        <h1>Visão geral</h1>
        <p class="page-subtitle">Acompanhe as demandas da sua empresa.</p>
    </div>
    <a class="btn btn-primary" href="/nova"><?= icon('plus') ?><span>Nova tarefa</span></a>
</header>

<?php if ($notice): ?>
    <div class="message message-success" role="status"><?= icon('check-circle') ?><span><?= webEscape($notice) ?></span></div>
<?php endif; ?>

<section class="metrics" aria-label="Indicadores globais">
    <div class="metric">
        <span class="metric-label">Total de tarefas</span>
        <strong class="metric-value"><?= $counts['total'] ?></strong>
    </div>
    <div class="metric">
        <span class="metric-label">Em aberto</span>
        <strong class="metric-value"><?= $counts['Aberto'] ?></strong>
    </div>
    <div class="metric">
        <span class="metric-label">Concluídas</span>
        <strong class="metric-value success-text"><?= $counts['Concluido'] ?></strong>
        <?php if ($donePercent !== null): ?>
            <span class="metric-note"><?= $donePercent ?>% concluído</span>
            <span class="progress" aria-hidden="true"><span style="width: <?= $donePercent ?>%"></span></span>
        <?php endif; ?>
    </div>
</section>

<section class="panel" aria-labelledby="tasks-title">
    <div class="panel-head">
        <div>
            <h2 id="tasks-title">Tarefas</h2>
            <p class="panel-count" aria-live="polite"><?= $found ?> <?= $found === 1 ? 'tarefa encontrada' : 'tarefas encontradas' ?></p>
        </div>
        <nav class="tabs" aria-label="Filtrar por status">
            <?php foreach ($tabs as $value => [$label, $count]): ?>
                <a class="tab<?= $filters['status'] === $value ? ' is-active' : '' ?>" href="<?= webEscape(webUrl(['status' => $value] + $filters)) ?>"<?= $filters['status'] === $value ? ' aria-current="page"' : '' ?>><?= $label ?> <span class="tab-count"><?= $count ?></span></a>
            <?php endforeach; ?>
        </nav>
    </div>

    <form class="filters" method="get" action="/" role="search">
        <input type="hidden" name="status" value="<?= webEscape($filters['status']) ?>">
        <div class="field field-search">
            <label for="q">Buscar tarefas</label>
            <div class="input-icon">
                <?= icon('search', 18) ?>
                <input id="q" type="search" name="q" value="<?= webEscape($filters['q']) ?>" maxlength="<?= WEB_SEARCH_MAX ?>" placeholder="Título ou descrição">
            </div>
        </div>
        <div class="field">
            <label for="prioridade">Prioridade</label>
            <select id="prioridade" name="prioridade" data-autosubmit>
                <option value="">Todas as prioridades</option>
                <?php foreach (WEB_PRIORITY_LABELS as $value => [$label]): ?>
                    <option value="<?= $value ?>"<?= $filters['prioridade'] === $value ? ' selected' : '' ?>><?= $label ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="filters-actions">
            <button class="btn btn-secondary" type="submit">Aplicar</button>
            <?php if (webHasFilters($filters)): ?>
                <a class="btn btn-ghost" href="/"><?= icon('x', 18) ?><span>Limpar filtros</span></a>
            <?php endif; ?>
        </div>
    </form>

    <?php if ($counts['total'] === 0): ?>
        <div class="empty">
            <span class="empty-icon"><?= icon('inbox', 32) ?></span>
            <h3>Nenhuma tarefa cadastrada</h3>
            <p>Cadastre a primeira demanda pelo painel ou pelo aplicativo.</p>
            <a class="btn btn-primary" href="/nova"><?= icon('plus') ?><span>Cadastrar primeira tarefa</span></a>
        </div>
    <?php elseif ($found === 0): ?>
        <div class="empty">
            <span class="empty-icon"><?= icon('search', 32) ?></span>
            <h3>Nenhuma tarefa encontrada</h3>
            <p>Nenhuma tarefa corresponde aos filtros aplicados.</p>
            <a class="btn btn-secondary" href="/"><?= icon('x', 18) ?><span>Limpar filtros</span></a>
        </div>
    <?php else: ?>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th scope="col">Tarefa</th>
                        <th scope="col">Prioridade</th>
                        <th scope="col">Status</th>
                        <th scope="col">Criada em (UTC)</th>
                        <th scope="col"><span class="visually-hidden">Ações</span></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($tasks as $task):
                    [$priorityLabel, $priorityClass] = WEB_PRIORITY_LABELS[$task['prioridade']] ?? [(string) $task['prioridade'], ''];
                    $done = $task['status'] === 'Concluido';
                    $title = (string) $task['titulo'];
                    $description = (string) $task['descricao'];
                    ?>
                    <tr class="<?= $done ? 'is-done' : '' ?>">
                        <td class="task-title" data-label="Tarefa">
                            <strong><?= webEscape($title) ?></strong>
                            <?php if ($description !== ''): ?><span class="task-desc"><?= webEscape($description) ?></span><?php endif; ?>
                        </td>
                        <td data-label="Prioridade"><span class="badge badge-<?= $priorityClass ?>"><span class="dot" aria-hidden="true"></span><?= webEscape($priorityLabel) ?></span></td>
                        <td data-label="Status">
                            <span class="badge <?= $done ? 'badge-done' : 'badge-open' ?>"><?= icon($done ? 'check-circle' : 'circle', 14) ?><?= $done ? 'Concluído' : 'Aberto' ?></span>
                        </td>
                        <td class="task-date" data-label="Criada em (UTC)"><?= webEscape(webDate((string) $task['criado_em'])) ?></td>
                        <td class="task-actions" data-label="Ações">
                            <form method="post" action="/status">
                                <input type="hidden" name="id" value="<?= (int) $task['id'] ?>">
                                <input type="hidden" name="novo_status" value="<?= $done ? 'Aberto' : 'Concluido' ?>">
                                <?= filterFields($filters) ?>
                                <?= csrfField() ?>
                                <button class="btn <?= $done ? 'btn-neutral-ghost' : 'btn-success-ghost' ?>" type="submit" aria-label="<?= $done ? 'Reabrir' : 'Concluir' ?> tarefa <?= webEscape($title) ?>"><?= icon($done ? 'rotate-ccw' : 'check', 18) ?><span><?= $done ? 'Reabrir' : 'Concluir' ?></span></button>
                            </form>
                            <a class="btn btn-danger-ghost" href="<?= webEscape(webUrl($filters, '/excluir', ['id' => (int) $task['id']])) ?>" aria-label="Excluir tarefa <?= webEscape($title) ?>"><?= icon('trash-2', 18) ?><span>Excluir</span></a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</section>
