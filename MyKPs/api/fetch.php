<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$user_id = authenticate();
$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>'POST.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$tables = $input['tables'] ?? [];
$result = [];

foreach ($tables as $table => $ids) {
    if (!in_array($table, $ALLOWED_TABLES) || !is_array($ids) || empty($ids)) {
        $result[$table] = [];
        continue;
    }
    $idCol = $ID_COLS[$table];
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $params = array_merge([$user_id], $ids);
    $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE userid = ? AND `$idCol` IN ($placeholders)");
$stmt->execute($params);
$rows = $stmt->fetchAll();
foreach ($rows as &$row) convertTime($row, 'iso');
    if (isset($row['subjects']) && is_string($row['subjects'])) {
        $decoded = json_decode($row['subjects'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $row['subjects'] = $decoded;
        } else {
            $row['subjects'] = [];
        }
    }
unset($row['userid']);
$result[$table] = $rows;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);