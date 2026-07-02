<?php
// backend/src/api.php
// Main API router and logic

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/auth.php';

// Prevent caching of API responses
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Type: application/json');

$action = $_REQUEST['action'] ?? '';

// Allow login without token
if ($action !== 'login') {
    require_auth_or_die();
}

// If request body is JSON, decode into $_POST for handlers that expect POST fields
$ct = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
if (stripos($ct, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (is_array($json)) {
        foreach ($json as $k => $v) {
            // only populate if not already present in $_POST
            if (!isset($_POST[$k])) $_POST[$k] = $v;
        }
    }
}

switch ($action) {
    case 'save_record':
        require_once __DIR__ . '/handlers/save_record.php';
        break;
    case 'update_record':
        require_once __DIR__ . '/handlers/update_record.php';
        break;
    case 'list_records':
        require_once __DIR__ . '/handlers/list_records.php';
        break;
    case 'get_crops':
        require_once __DIR__ . '/handlers/get_crops.php';
        break;
    case 'crop_boxes':
        require_once __DIR__ . '/handlers/crop_boxes.php';
        break;
    case 'generate_paper':
        require_once __DIR__ . '/handlers/generate_paper.php';
        break;
    case 'upload':
        require_once __DIR__ . '/handlers/upload.php';
        break;
    case 'login':
        require_once __DIR__ . '/handlers/login.php';
        break;
    default:
        echo json_encode(['success' => 0, 'error' => 'Unknown action']);
        break;
}