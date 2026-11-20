<?php
// Single place for app-wide settings. Change APP_NAME here and it changes everywhere.
const APP_NAME = 'Booth';          // working name, set the final one here
const APP_ENV  = 'local';          // 'local' shows detailed errors; use 'production' for the final demo

// Full web address of the project folder (no trailing slash).
// It must match the folder name under C:\xampp\htdocs.
const BASE_URL = 'http://localhost/BOOTH';

// Folder path on disk (the project root, one level above /config).
define('BASE_PATH', dirname(__DIR__));

date_default_timezone_set('Asia/Manila');

if (APP_ENV === 'local') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    ini_set('display_errors', '0');
}