<?php
// Shared helpers for the server-rendered panel: escaping, filters, URLs, CSRF, flash notices and rendering.
declare(strict_types=1);

const WEB_STATUSES = ['', 'Aberto', 'Concluido'];
const WEB_PRIORITIES = ['', 'Baixa', 'Media', 'Alta'];
const WEB_SEARCH_MAX = 100;
const WEB_PRIORITY_LABELS = ['Alta' => ['Alta', 'high'], 'Media' => ['Média', 'medium'], 'Baixa' => ['Baixa', 'low']];

function webEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function webStartSession(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        ]);
        session_start();
    }
    if (empty($_SESSION['web_csrf'])) {
        webRotateCsrf();
    }
}

/**
 * Validates the panel filters. Every value must be a string from the allowed lists;
 * the search term is trimmed and limited to WEB_SEARCH_MAX characters.
 *
 * @return array{status:string, prioridade:string, q:string}
 * @throws InvalidArgumentException when a value was tampered with
 */
function webFilters(array $input): array
{
    $filters = [];
    foreach (['status', 'prioridade', 'q'] as $key) {
        $value = $input[$key] ?? '';
        if (!is_string($value)) {
            throw new InvalidArgumentException('Filtro inválido.');
        }
        $filters[$key] = $value;
    }
    // preg_replace returns null on invalid UTF-8: reject it instead of searching without a term.
    $term = preg_replace('/\A[\s\p{Z}]+|[\s\p{Z}]+\z/u', '', $filters['q']);
    if ($term === null) {
        throw new InvalidArgumentException('Filtro inválido.');
    }
    $filters['q'] = $term;
    $length = preg_match_all('/./us', $term);
    if (!in_array($filters['status'], WEB_STATUSES, true)
        || !in_array($filters['prioridade'], WEB_PRIORITIES, true)
        || $length > WEB_SEARCH_MAX) {
        throw new InvalidArgumentException('Filtro inválido.');
    }
    return $filters;
}

/** Builds a panel URL keeping only non-empty filters, in a stable order (status, prioridade, q). */
function webUrl(array $filters, string $path = '/', array $extra = []): string
{
    $query = $extra;
    foreach (['status', 'prioridade', 'q'] as $key) {
        if (($filters[$key] ?? '') !== '') {
            $query[$key] = $filters[$key];
        }
    }
    return $path . ($query === [] ? '' : '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986));
}

function webHasFilters(array $filters): bool
{
    return $filters['status'] !== '' || $filters['prioridade'] !== '' || $filters['q'] !== '';
}

/** Hidden inputs that carry the active filters through a POST form. */
function filterFields(array $filters): string
{
    $html = '';
    foreach (['status', 'prioridade', 'q'] as $key) {
        $html .= '<input type="hidden" name="' . $key . '" value="' . webEscape($filters[$key] ?? '') . '">';
    }
    return $html;
}

function csrfField(): string
{
    return '<input type="hidden" name="csrf" value="' . webEscape((string) $_SESSION['web_csrf']) . '">';
}

function csrfValid(): bool
{
    $token = $_POST['csrf'] ?? null;
    return is_string($token) && is_string($_SESSION['web_csrf'] ?? null) && hash_equals($_SESSION['web_csrf'], $token);
}

function webRotateCsrf(): void
{
    $_SESSION['web_csrf'] = bin2hex(random_bytes(32));
}

/**
 * Stores a one-time success message and redirects (POST → 303 → GET).
 * The CSRF token is per session (not rotated here) so several tabs and the Back button keep working.
 */
function webRedirect(string $url, string $notice): void
{
    $_SESSION['web_notice'] = $notice;
    header('Location: ' . $url, true, 303);
}

function webTakeNotice(): ?string
{
    $notice = $_SESSION['web_notice'] ?? null;
    unset($_SESSION['web_notice']);
    return is_string($notice) ? $notice : null;
}

function webDate(string $value): string
{
    try {
        return (new DateTimeImmutable($value))->setTimezone(new DateTimeZone('UTC'))->format('d/m/Y H:i');
    } catch (Throwable) {
        return 'Data indisponível';
    }
}

/** Renders a view inside the shared layout. Views only see the variables passed here. */
function webRender(string $view, array $vars, string $pageTitle, string $activeNav = 'overview'): void
{
    require_once __DIR__ . '/../views/partials/icons.php';
    $content = (static function (string $__view, array $__vars): string {
        extract($__vars, EXTR_SKIP);
        ob_start();
        require __DIR__ . '/../views/' . $__view . '.php';
        return (string) ob_get_clean();
    })($view, $vars);
    require __DIR__ . '/../views/layout.php';
}
