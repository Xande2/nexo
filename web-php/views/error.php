<?php
/** @var string $error @var string $title @var string $backUrl */
declare(strict_types=1);
?>
<header class="page-header">
    <div>
        <p class="eyebrow">Painel de tarefas</p>
        <h1><?= webEscape($title) ?></h1>
        <p class="page-subtitle">Confira a mensagem abaixo e volte para a lista de tarefas.</p>
    </div>
</header>
<div class="message message-error" role="alert"><?= icon('alert-circle') ?><span><?= webEscape($error) ?></span></div>
<a class="btn btn-secondary" href="<?= webEscape($backUrl) ?>"><?= icon('arrow-left', 18) ?><span>Voltar para tarefas</span></a>
