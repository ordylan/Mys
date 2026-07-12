<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>'POST!']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error'=>'Username and password required']);
    exit;
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute([$username]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error'=>'Username already exists']);
    exit;
}

//自动加盐
$hashed = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (username, pass) VALUES (?, ?)");
$stmt->execute([$username, $hashed]);

echo json_encode(['success'=>true, 'message'=>'User registered successfully']);