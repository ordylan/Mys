<?php
// backend/src/handlers/login.php
// Simple login to issue JWT tokens

$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if (!$username || !$password) {
    echo json_encode(['success' => 0, 'error' => 'Missing credentials']);
    exit;
}

if (!verify_credentials($username, $password)) {
    http_response_code(401);
    echo json_encode(['success' => 0, 'error' => 'Invalid credentials']);
    exit;
}

// include roles in token payload so require_role() can verify
$roles = get_user_roles($username);
$payload = ['user' => $username, 'roles' => $roles];
$token = jwt_encode($payload, 60*60*24*30); 

echo json_encode(['success' => 1, 'token' => $token, 'roles' => $roles]);
