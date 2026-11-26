<?php
/** @var string $pageTitle @var string $activeNav @var string $content */
declare(strict_types=1);
$navItems = [
    'overview' => ['/', 'layout-dashboard', 'Visão geral'],
    'new' => ['/nova', 'plus', 'Nova tarefa'],
];
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= webEscape($pageTitle) ?> | Nexo</title>
    <link rel="stylesheet" href="/assets/dashboard.css">
    <script src="/assets/app.js" defer></script>
</head>
<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<div class="layout">
    <aside class="sidebar">
        <a class="brand" href="/" aria-label="Nexo, visão geral">nexo.</a>
        <p class="sidebar-tagline">Gestão de tarefas</p>
        <nav aria-label="Navegação principal">
            <?php foreach ($navItems as $key => [$href, $iconName, $label]): ?>
                <a class="nav-link<?= $activeNav === $key ? ' is-active' : '' ?>" href="<?= $href ?>"<?= $activeNav === $key ? ' aria-current="page"' : '' ?>>
                    <?= icon($iconName) ?><span><?= $label ?></span>
                </a>
            <?php endforeach; ?>
        </nav>
        <small class="sidebar-footer">Conectando demandas<br>a resultados.</small>
    </aside>
    <main id="conteudo" tabindex="-1">
        <?= $content ?>
    </main>
</div>
</body>
</html>
