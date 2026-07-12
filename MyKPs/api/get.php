<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

// 认证
$user_id = authenticate();

$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>'POST']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$tables = $input['tables'] ?? [];
$result = [];

foreach ($tables as $t) {
    if (!in_array($t, $ALLOWED_TABLES)) continue;
    $cfg = $TABLE_CONFIG[$t];
    $stmt = $pdo->prepare("SELECT `{$cfg['id']}`,`{$cfg['time']}` FROM `$t` WHERE userid = ?");
$stmt->execute([$user_id]);
$rows = $stmt->fetchAll();
foreach ($rows as &$row) convertTime($row, 'iso');
$result[$t] = $rows;}

echo json_encode($result, JSON_UNESCAPED_UNICODE);