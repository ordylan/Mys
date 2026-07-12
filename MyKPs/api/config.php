<?php
define('JWT_SECRET', 'yourself it a!');
$TIME_FIELDS = ['createdAt','updatedAt','pinnedAt','timestamp','lastClicked','statusUpdatedAt'];

$ALLOWED_TABLES = ['Announcements','AppConfig','DailyPlans','Flawless','KPs','MyLearningLogs'];

$TABLE_CONFIG = [
    'Announcements'  => ['id'=>'id', 'time'=>'updatedAt', 'fields'=>['text','createdAt','updatedAt','pinned','pinnedAt','deleted']],
    'AppConfig'      => ['id'=>'id', 'time'=>'updatedAt', 'fields'=>['subjects','updatedAt','deleted']],
    'DailyPlans'     => ['id'=>'id', 'time'=>'statusUpdatedAt', 'fields'=>['date','category','tag','content','kpsId','status','createdAt','statusUpdatedAt','deleted']],
    'Flawless'       => ['id'=>'id', 'time'=>'updatedAt', 'fields'=>['date','text','updatedAt']],
    'KPs'            => ['id'=>'uniqueId', 'time'=>'updatedAt', 'fields'=>['subject','name','clickCount','lastClicked','updatedAt','deleted']],
    'MyLearningLogs' => ['id'=>'id', 'time'=>'timestamp', 'fields'=>['KPsId','KPsName','timestamp']]
];

$ID_COLS = [];
foreach ($TABLE_CONFIG as $table => $cfg) {
    $ID_COLS[$table] = $cfg['id'];
}
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=127.0.0.1;dbname=MyKPs;charset=utf8mb4',
            'mykps',
            'passsssssssssssssss',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
    return $pdo;
}
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generate_token($user_id, $expire_seconds = 2666666) {
    $expire = time() + $expire_seconds;
    $data = "$user_id:$expire";
    $signature = hash_hmac('sha256', $data, JWT_SECRET);
    return base64_encode("$data:$signature");
}

function verify_token($token) {
    $decoded = base64_decode($token, true);
    if ($decoded === false) return null;
    $parts = explode(':', $decoded);
    if (count($parts) !== 3) return null;
    list($user_id, $expire, $signature) = $parts;
    if (time() > (int)$expire) return null;
    $data = "$user_id:$expire";
    $expected = hash_hmac('sha256', $data, JWT_SECRET);
    if (!hash_equals($expected, $signature)) return null;
    return (int)$user_id;
}

function authenticate() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (!preg_match('/KaoYanBiSheng\s+(.*)$/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['error'=>'ReLoginAgain']);
        exit;
    }
    $token = $matches[1];
    $user_id = verify_token($token);
    if ($user_id === null) {
        http_response_code(401);
        echo json_encode(['error'=>'ReLoginAgain']);
        exit;
    }
    return $user_id;
}
function convertTime(&$data, $to='mysql') {
    if (!is_array($data)) return;
    foreach ($data as $k => &$v) {
        if (is_array($v)) { convertTime($v, $to); continue; }
        if (!in_array($k, $GLOBALS['TIME_FIELDS']) || !is_string($v)) continue;
        try {
            $dt = new DateTime($v);
            $dt->setTimezone(new DateTimeZone('UTC'));
            if ($to === 'mysql') {
                $v = $dt->format('Y-m-d H:i:s.v');
            } else {
                $v = $dt->format('Y-m-d\TH:i:s.v\Z');
            }
        } catch (Exception $e) {
        }
    }
}