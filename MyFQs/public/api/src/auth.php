<?php
// backend/src/auth.php

$JWT_SECRET = 'Replace it! --ORDYLAN';  // set this to a random string in your config
$AUTH_USERS = [
    'admin' => [ 'hash' => password_hash('admin', PASSWORD_DEFAULT), 'roles' => ['view','upload','edit'] ],
       // 'viewer' => [ 'hash' => password_hash('viewerpass', PASSWORD_DEFAULT), 'roles' => ['view'] ],
];

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function base64url_decode($data) {
    $pad = 4 - (strlen($data) % 4);
    if ($pad < 4) $data .= str_repeat('=', $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode($payload, $exp = 3600) {
    global $JWT_SECRET;
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload['iat'] = time();
    $payload['exp'] = time() + $exp;
    $h = base64url_encode(json_encode($header));
    $p = base64url_encode(json_encode($payload));
    $sig = hash_hmac('sha256', "$h.$p", $JWT_SECRET, true);
    $s = base64url_encode($sig);
    return "$h.$p.$s";
}

function jwt_decode($token) {
    global $JWT_SECRET;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($h, $p, $s) = $parts;
    $sig = base64url_decode($s);
    $expect = hash_hmac('sha256', "$h.$p", $JWT_SECRET, true);
    if (!hash_equals($expect, $sig)) return false;
    $payload = json_decode(base64url_decode($p), true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > intval($payload['exp'])) return false;
    return $payload;
}

function get_bearer_token() {
    // Authorization: Bearer <token>
    $h = null;
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) $h = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    if ($h && preg_match('/Bearer\s+(.*)$/i', $h, $m)) return trim($m[1]);
    if (!empty($_REQUEST['token'])) return $_REQUEST['token'];
    return null;
}

function require_auth_or_die() {
    $token = get_bearer_token();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => 0, 'error' => 'Unauthorized']);
        exit;
    }
    $payload = jwt_decode($token);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['success' => 0, 'error' => 'Unauthorized']);
        exit;
    }
    return $payload;
}

function require_role($role) {
    $payload = require_auth_or_die();
    if (!isset($payload['roles']) || !is_array($payload['roles']) || !in_array($role, $payload['roles'])) {
        http_response_code(403);
        echo json_encode(['success' => 0, 'error' => 'Forbidden: missing role ' . $role]);
        exit;
    }
    return $payload;
}

function verify_credentials($username, $password) {
    global $AUTH_USERS;
    if (!isset($AUTH_USERS[$username])) return false;
    return password_verify($password, $AUTH_USERS[$username]['hash']);
}

function get_user_roles($username) {
    global $AUTH_USERS;
    if (!isset($AUTH_USERS[$username])) return [];
    return $AUTH_USERS[$username]['roles'] ?? [];
}
