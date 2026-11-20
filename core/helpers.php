<?php
/** Escape a value for safe output inside HTML. Use in every view. */
function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
