<?php
/** @var array<string, mixed> $task @var array{status:string, prioridade:string, q:string} $filters */
declare(strict_types=1);
?>
<header class="page-header">
    <div>
        <p class="eyebrow">Tarefas</p>
        <h1>Confirmar exclusão</h1>
        <p class="page-subtitle">Esta ação não pode ser desfeita.</p>
    </div>
</header>
<section class="panel confirm" aria-labelledby="confirm-title">
    <span class="confirm-icon"><?= icon('trash-2', 24) ?></span>
    <h2 id="confirm-title">Excluir tarefa?</h2>
    <p>Você está prestes a excluir <strong><?= webEscape((string) $task['titulo']) ?></strong>. Ela deixará de aparecer no painel e no aplicativo.</p>
    <div class="actions">
        <form method="post" action="/excluir">
            <input type="hidden" name="id" value="<?= (int) $task['id'] ?>">
            <?= filterFields($filters) ?>
            <?= csrfField() ?>
            <button class="btn btn-danger" type="submit"><?= icon('trash-2', 18) ?><span>Sim, excluir tarefa</span></button>
        </form>
        <a class="btn btn-secondary" href="<?= webEscape(webUrl($filters)) ?>"><?= icon('arrow-left', 18) ?><span>Cancelar</span></a>
    </div>
</section>
