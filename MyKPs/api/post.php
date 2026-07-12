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
$allRes = [];


$pdo->beginTransaction();
try {
    foreach ($tables as $table => $records) {
        if (!isset($TABLE_CONFIG[$table]) || !is_array($records)) continue;
        $cfg = $TABLE_CONFIG[$table];
        $res = [];
        foreach ($records as $i => $rec) {
            $id    = $rec[$cfg['id']] ?? null;
            $ctime = $rec[$cfg['time']] ?? null;
            if ($id === null || $ctime === null) {
                $res[] = ['i'=>$i, 's'=>'skip', 'r'=>'missing id/time'];
                continue;
            }

            // 过滤字段
            $data = [$cfg['id'] => $id, $cfg['time'] => $ctime];
            foreach ($cfg['fields'] as $f) {
if ($table === 'AppConfig' && isset($data['subjects']) && is_array($data['subjects'])) {
    $data['subjects'] = json_encode($data['subjects'], JSON_UNESCAPED_UNICODE);
}
                if (array_key_exists($f, $rec)) $data[$f] = $rec[$f];
            }
convertTime($data, 'mysql');
$ctime = $data[$cfg['time']];
if ($table === 'Announcements') {
    if (!isset($data['pinned']) || $data['pinned'] === '') {
        $data['pinned'] = 0;
    }
    $data['pinned'] = (int) $data['pinned'];
}
            // 查询服务器时间
            $stmt = $pdo->prepare("SELECT `{$cfg['time']}` FROM `$table` WHERE userid = ? AND `{$cfg['id']}` = ?");
            $stmt->execute([$user_id, $id]);
            $sTime = $stmt->fetchColumn();

            if ($sTime === false) {
                // 插入
                $cols = array_merge(array_keys($data), ['userid']);
                $vals = array_merge(array_values($data), [$user_id]);
                $ph = implode(',', array_fill(0, count($cols), '?'));
                $pdo->prepare("INSERT INTO `$table` (`".implode('`,`',$cols)."`) VALUES ($ph)")->execute($vals);
                $res[] = ['i'=>$i, 's'=>'inserted', 'id'=>$id];
            } elseif ($ctime > $sTime) {
                // 更新
                $sets = [];
                $params = [];
                foreach ($data as $k => $v) {
                    if ($k === $cfg['id']) continue;
                    $sets[] = "`$k` = ?";
                    $params[] = $v;
                }
                if ($sets) {
                    $params[] = $user_id;
                    $params[] = $id;
                    $pdo->prepare("UPDATE `$table` SET ".implode(',', $sets)." WHERE userid = ? AND `{$cfg['id']}` = ?")->execute($params);
                    $res[] = ['i'=>$i, 's'=>'updated', 'id'=>$id];
                } else {
                    $res[] = ['i'=>$i, 's'=>'skip', 'r'=>'no fields'];
                }
            } else {
                $res[] = ['i'=>$i, 's'=>'skip', 'r'=>'server newer'];
            }
        }
        $allRes[$table] = $res;
    }
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

echo json_encode(['results' => $allRes], JSON_UNESCAPED_UNICODE);