<?php
/** A person who can sign in. Private properties, getters, and the lockout rules live here. */
class User extends Model
{
    public const MAX_ATTEMPTS = 5;
    public const LOCK_MINUTES = 15;

    private ?int $id = null;
    private ?string $email = null;
    private ?string $passwordHash = null;
    private string $pinHash = '';
    private string $displayName = '';
    private bool $locked = false;
    private int $lockMinutes = 0;

    // is_locked and lock_min use the database clock, so PHP and PostgreSQL time zones never disagree.
    private const COLUMNS = 'id, email, password_hash, pin_hash, display_name,
        (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked,
        COALESCE(CEIL(EXTRACT(EPOCH FROM (locked_until - NOW())) / 60), 0) AS lock_min';

    public function findByEmail(string $email): ?self
    {
        return $this->findOne('lower(email) = lower(:v)', $email);
    }

    public function findById(int $id): ?self
    {
        return $this->findOne('id = :v', $id);
    }

    private function findOne(string $where, $value): ?self
    {
        try {
            $stmt = $this->db->prepare('SELECT ' . self::COLUMNS . " FROM users WHERE $where LIMIT 1");
            $stmt->execute(['v' => $value]);
            $row = $stmt->fetch();
        } catch (PDOException $e) {
            $this->fail($e);
        }
        return $row ? $this->hydrate($row) : null;
    }

    private function hydrate(array $row): self
    {
        $user = new self($this->db);
        $user->id           = (int) $row['id'];
        $user->email        = $row['email'];
        $user->passwordHash = $row['password_hash'];
        $user->pinHash      = (string) $row['pin_hash'];
        $user->displayName  = (string) $row['display_name'];
        $user->locked       = (bool) $row['is_locked'];
        $user->lockMinutes  = (int) $row['lock_min'];
        return $user;
    }

    public function getId(): int             { return (int) $this->id; }
    public function getEmail(): ?string      { return $this->email; }
    public function getDisplayName(): string { return $this->displayName; }
    public function isLocked(): bool         { return $this->locked; }

    public function lockMessage(): string
    {
        $m = max(1, $this->lockMinutes);
        return 'Too many wrong attempts. Try again in ' . $m . ' minute' . ($m === 1 ? '' : 's') . '.';
    }

    public function checkPassword(string $plain): bool
    {
        return $this->passwordHash !== null && $this->passwordHash !== ''
            && password_verify($plain, $this->passwordHash);
    }

    public function checkPin(string $plain): bool
    {
        return $this->pinHash !== '' && password_verify($plain, $this->pinHash);
    }

    /**
     * Count a wrong password or PIN. The 5th wrong try locks the account for 15 minutes.
     * Returns true when the account is now locked.
     */
    public function recordFailure(): bool
    {
        try {
            $this->db->beginTransaction();
            // An old, expired lock starts a fresh count.
            $this->db->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL
                                WHERE id = :id AND locked_until IS NOT NULL AND locked_until <= NOW()')
                     ->execute(['id' => $this->id]);
            $this->db->prepare('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = :id')
                     ->execute(['id' => $this->id]);
            $this->db->prepare("UPDATE users SET locked_until = NOW() + INTERVAL '" . self::LOCK_MINUTES . " minutes'
                                WHERE id = :id AND failed_attempts >= " . self::MAX_ATTEMPTS . ' AND locked_until IS NULL')
                     ->execute(['id' => $this->id]);
            $stmt = $this->db->prepare('SELECT ' . self::COLUMNS . ' FROM users WHERE id = :id');
            $stmt->execute(['id' => $this->id]);
            $row = $stmt->fetch();
            $this->db->commit();
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            $this->fail($e);
        }
        $this->locked      = (bool) $row['is_locked'];
        $this->lockMinutes = (int) $row['lock_min'];
        return $this->locked;
    }

    public function clearFailures(): void
    {
        try {
            $this->db->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = :id')
                     ->execute(['id' => $this->id]);
        } catch (PDOException $e) {
            $this->fail($e);
        }
    }

    protected function validate(): void
    {
        $len = mb_strlen(trim($this->displayName));
        if ($len < 2 || $len > 80) {
            throw new InvalidArgumentException('Name must be 2 to 80 characters.');
        }
        if ($this->email !== null && !filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Enter a valid email address.');
        }
    }
}