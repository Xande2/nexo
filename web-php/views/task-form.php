<?php
/**
 * @var array{titulo:string, descricao:string, prioridade:string} $values
 * @var array<string, string> $errors
 * @var ?string $formError
 */
declare(strict_types=1);
$fieldError = static function (string $field) use ($errors): string {
    return isset($errors[$field])
        ? ' aria-invalid="true" aria-describedby="' . $field . '-erro"'
        : '';
};
// Native autofocus (works without JavaScript) on the first invalid field in form order; title otherwise.
$focusField = array_values(array_intersect(['titulo', 'descricao', 'prioridade'], array_keys($errors)))[0] ?? 'titulo';
$autofocus = static fn (string $field): string => $field === $focusField ? ' autofocus' : '';
$titleLength = preg_match_all('/./us', $values['titulo']) ?: 0;
?>
<header class="page-header">
    <div>
        <p class="eyebrow">Tarefas</p>
        <h1>Nova tarefa</h1>
        <p class="page-subtitle">Registre uma demanda para a equipe acompanhar no painel e no aplicativo.</p>
    </div>
</header>

<?php if ($formError): ?>
    <div class="message message-error" role="alert"><?= icon('alert-circle') ?><span><?= webEscape($formError) ?></span></div>
<?php endif; ?>

<section class="panel form-panel" aria-label="Formulário de nova tarefa">
    <form class="task-form" method="post" action="/nova" novalidate>
        <?= csrfField() ?>

        <div class="field">
            <label for="titulo">Título <span class="required">obrigatório</span></label>
            <input id="titulo" type="text" name="titulo" value="<?= webEscape($values['titulo']) ?>" maxlength="200" required<?= $autofocus('titulo') ?> placeholder="Ex.: Preparar pauta da reunião" data-counter="titulo-contador"<?= $fieldError('titulo') ?>>
            <div class="field-meta">
                <?php if (isset($errors['titulo'])): ?>
                    <span class="field-error" id="titulo-erro"><?= icon('alert-circle', 16) ?><?= webEscape($errors['titulo']) ?></span>
                <?php endif; ?>
                <span class="counter" id="titulo-contador"><?= $titleLength ?>/200</span>
            </div>
        </div>

        <div class="field">
            <label for="descricao">Descrição <span class="optional">opcional</span></label>
            <textarea id="descricao" name="descricao" rows="5" maxlength="5000" placeholder="Inclua os detalhes da demanda"<?= $fieldError('descricao') ?><?= $autofocus('descricao') ?>><?= webEscape($values['descricao']) ?></textarea>
            <?php if (isset($errors['descricao'])): ?>
                <span class="field-error" id="descricao-erro"><?= icon('alert-circle', 16) ?><?= webEscape($errors['descricao']) ?></span>
            <?php endif; ?>
        </div>

        <fieldset class="field priority-group"<?= isset($errors['prioridade']) ? ' aria-describedby="prioridade-erro"' : '' ?>>
            <legend>Prioridade</legend>
            <div class="priority-options">
                <?php foreach (['Baixa', 'Media', 'Alta'] as $index => $value):
                    [$label, $class] = WEB_PRIORITY_LABELS[$value]; ?>
                    <label class="priority-option priority-<?= $class ?>">
                        <input type="radio" name="prioridade" value="<?= $value ?>"<?= $values['prioridade'] === $value ? ' checked' : '' ?><?= $fieldError('prioridade') ?><?= $index === 0 ? $autofocus('prioridade') : '' ?>>
                        <span><span class="dot" aria-hidden="true"></span><?= $label ?></span>
                    </label>
                <?php endforeach; ?>
            </div>
            <?php if (isset($errors['prioridade'])): ?>
                <span class="field-error" id="prioridade-erro"><?= icon('alert-circle', 16) ?><?= webEscape($errors['prioridade']) ?></span>
            <?php endif; ?>
        </fieldset>

        <p class="form-note"><?= icon('circle', 16) ?>A tarefa será cadastrada como Aberta.</p>

        <div class="actions">
            <button class="btn btn-primary" type="submit"><?= icon('plus') ?><span>Cadastrar tarefa</span></button>
            <a class="btn btn-secondary" href="/"><?= icon('arrow-left', 18) ?><span>Cancelar</span></a>
        </div>
    </form>
</section>
