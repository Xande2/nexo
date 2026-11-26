<?php
declare(strict_types=1);

namespace Nexo;

use PDO;

final class TaskRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function all(?string $status = null): array
    {
        if ($status !== null) {
            $this->validateStatus($status);
        }
        $query = $this->pdo->prepare('SELECT id, titulo, descricao, prioridade, status, criado_em
            FROM chamados' . ($status !== null ? ' WHERE status = :status' : '') . '
            ORDER BY criado_em DESC, id DESC');
        $query->execute($status !== null ? ['status' => $status] : []);
        return $query->fetchAll();
    }

    /**
     * Panel listing: optional status and priority plus a literal text search over title and description.
     * An empty string or null means "no filter". LIKE wildcards typed by the user are escaped.
     */
    public function search(?string $status, ?string $prioridade, string $q): array
    {
        $where = [];
        $params = [];
        if ($status !== null && $status !== '') {
            $this->validateStatus($status);
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        if ($prioridade !== null && $prioridade !== '') {
            $this->validatePriority($prioridade);
            $where[] = 'prioridade = :prioridade';
            $params['prioridade'] = $prioridade;
        }
        if ($q !== '') {
            $where[] = "(titulo LIKE :q ESCAPE '\\' OR descricao LIKE :q ESCAPE '\\')";
            $params['q'] = '%' . strtr($q, ['\\' => '\\\\', '%' => '\\%', '_' => '\\_']) . '%';
        }
        $query = $this->pdo->prepare('SELECT id, titulo, descricao, prioridade, status, criado_em
            FROM chamados' . ($where !== [] ? ' WHERE ' . implode(' AND ', $where) : '') . '
            ORDER BY criado_em DESC, id DESC');
        $query->execute($params);
        return $query->fetchAll();
    }

    /** @return array{total:int, Aberto:int, Concluido:int} */
    public function counts(): array
    {
        $counts = ['total' => 0, 'Aberto' => 0, 'Concluido' => 0];
        foreach ($this->pdo->query('SELECT status, COUNT(*) AS quantidade FROM chamados GROUP BY status') as $row) {
            $counts[$row['status']] = (int) $row['quantidade'];
            $counts['total'] += (int) $row['quantidade'];
        }
        return $counts;
    }

    public function create(array $input): array
    {
        $fields = [];
        $title = $input['titulo'] ?? null;
        if (!is_string($title) || !$this->validText($title)) {
            $fields['titulo'] = 'Informe um título em texto.';
        } else {
            // PCRE Unicode is available without mbstring; count code points, not bytes.
            $title = preg_replace('/\A[\s\p{Z}]+|[\s\p{Z}]+\z/u', '', $title);
            if ($title === '' || $this->length($title) > 200) {
                $fields['titulo'] = 'O título deve conter de 1 a 200 caracteres.';
            }
        }
        $description = array_key_exists('descricao', $input) ? $input['descricao'] : '';
        if (!is_string($description) || !$this->validText($description) || $this->length($description) > 5000) {
            $fields['descricao'] = 'A descrição deve ser texto com até 5000 caracteres.';
        }
        $priority = array_key_exists('prioridade', $input) ? $input['prioridade'] : 'Media';
        if (!$this->isPriority($priority)) {
            $fields['prioridade'] = 'Selecione Baixa, Media ou Alta.';
        }
        if ($fields !== []) {
            throw new HttpException(422, 'Verifique os campos informados.', $fields);
        }
        $query = $this->pdo->prepare('INSERT INTO chamados (titulo, descricao, prioridade)
            VALUES (:titulo, :descricao, :prioridade)');
        $query->execute(['titulo' => $title, 'descricao' => $description, 'prioridade' => $priority]);
        return $this->find((int) $this->pdo->lastInsertId());
    }

    public function setStatus(int $id, string $status): array
    {
        $this->validateStatus($status);
        $this->validateId($id);
        $query = $this->pdo->prepare('UPDATE chamados SET status = :status WHERE id = :id');
        $query->execute(['status' => $status, 'id' => $id]);
        // SELECT also handles idempotent updates and missing rows consistently.
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        $this->validateId($id);
        $query = $this->pdo->prepare('DELETE FROM chamados WHERE id = :id');
        $query->execute(['id' => $id]);
        if ($query->rowCount() === 0) {
            throw new HttpException(404, 'Tarefa não encontrada.');
        }
    }

    private function find(int $id): array
    {
        $query = $this->pdo->prepare('SELECT id, titulo, descricao, prioridade, status, criado_em
            FROM chamados WHERE id = :id');
        $query->execute(['id' => $id]);
        $task = $query->fetch();
        if ($task === false) {
            throw new HttpException(404, 'Tarefa não encontrada.');
        }
        return $task;
    }

    private function validateId(int $id): void
    {
        if ($id < 1) {
            throw new HttpException(404, 'Tarefa não encontrada.');
        }
    }

    private function validateStatus(string $status): void
    {
        if (!in_array($status, ['Aberto', 'Concluido'], true)) {
            throw new HttpException(422, 'Status inválido.', ['status' => 'Selecione Aberto ou Concluido.']);
        }
    }

    private function isPriority(mixed $priority): bool
    {
        return in_array($priority, ['Baixa', 'Media', 'Alta'], true);
    }

    private function validatePriority(string $priority): void
    {
        if (!$this->isPriority($priority)) {
            throw new HttpException(422, 'Prioridade inválida.', ['prioridade' => 'Selecione Baixa, Media ou Alta.']);
        }
    }

    private function validText(string $text): bool
    {
        return !str_contains($text, "\0") && preg_match('//u', $text) === 1;
    }

    private function length(string $text): int
    {
        return preg_match_all('/./us', $text);
    }
}
