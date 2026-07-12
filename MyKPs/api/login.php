<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>'POST?']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error'=>'Missing username or password']);
    exit;
}

$stmt = $pdo->prepare("SELECT id, pass FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['pass'])) {
    http_response_code(401);
    echo json_encode(['error'=>'Invalid credentials']);
    exit;
}

$token = generate_token($user['id']);
echo json_encode(['token' => $token]);