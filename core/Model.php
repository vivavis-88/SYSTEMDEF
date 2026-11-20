<?php
/**
 * Parent of every model: the shared PDO connection, error logging and
 * friendly database error messages. Models hold all SQL; controllers never do.
 * PostgreSQL version: errors are identified by SQLSTATE, not MySQL error numbers.
 */
abstract class Model
{
    protected PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? self::connection();
    }

    public static function connection(): PDO
    {
        return Database::getConnection();
    }

    /** Models that write data override this and throw InvalidArgumentException on bad input. */
    protected function validate(): void
    {
    }

    /** Log the technical error, then throw a message that is safe to show. */
    protected function fail(PDOException $e): never
    {
        self::logError($e);
        $state = (string) ($e->errorInfo[0] ?? $e->getCode());
        $text  = (string) ($e->errorInfo[2] ?? '');

        // 23503 covers two cases: deleting a parent that is still used, and saving a bad reference.
        $deletingParent = str_contains($text, 'update or delete on table') || str_contains($text, 'is still referenced');

        [$message, $code] = match (true) {
            $state === '23505'                    => ['That record already exists.', 1062],
            $state === '23503' && $deletingParent => ['This record is in use and cannot be deleted.', 1451],
            $state === '23503'                    => ['That choice is not valid.', 1452],
            $state === '23514'                    => ['One of the values is out of the allowed range.', 0],
            $state === '23502'                    => ['A required value is missing.', 0],
            default                               => ['Something went wrong, please try again.', 0],
        };
        throw new RuntimeException($message, $code, $e);
    }

    public static function logError(Throwable $e): void
    {
        $dir = BASE_PATH . '/storage/logs';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $line = '[' . date('Y-m-d H:i:s') . '] ' . get_class($e) . ': ' . $e->getMessage()
              . ' @ ' . basename($e->getFile()) . ':' . $e->getLine() . PHP_EOL;
        @file_put_contents($dir . '/app.log', $line, FILE_APPEND);
    }
}