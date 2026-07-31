<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$user_id = authenticate();
$action  = $_GET['action'] ?? '';
$method  = $_SERVER['REQUEST_METHOD'];
$pdo     = getDB();
function getSubjectDisplayMap($pdo, $user_id) {
    $stmt = $pdo->prepare("SELECT subjects FROM AppConfig WHERE userid = ? AND id = 'main'");
    $stmt->execute([$user_id]);
    $json = $stmt->fetchColumn();
    $map = [];
    if ($json) {
        $config = json_decode($json, true);
        if (is_array($config)) {
            foreach ($config as $item) {
                if (isset($item['key'])) {
                    $map[$item['key']] = $item['displayName'] ?? $item['key'];
                }
            }
        }
    }
    return $map;
}

function stopTimer($pdo, $user_id, $timerId) {
    $sql = "SELECT id, kpsid, start_time FROM ToTaLLog WHERE id = ? AND userid = ? AND end_time IS NULL";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$timerId, $user_id]);
    $timer = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$timer) {
        return ['success' => false, 'error' => 'Timer not found or already stopped'];
    }

    $endTime = gmdate('Y-m-d H:i:s.v');
    $start   = new DateTime($timer['start_time']);
    $end     = new DateTime($endTime);
    $diff    = max(0, $end->getTimestamp() - $start->getTimestamp()); // 秒数

    $updateSql = "UPDATE ToTaLLog SET end_time = ? WHERE id = ?";
    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute([$endTime, $timerId]);
    $upsertSql = "INSERT INTO ToTaL (userid, kpsid, alltime) VALUES (?, ?, ?)
                  ON DUPLICATE KEY UPDATE alltime = alltime + ?";
    $upsertStmt = $pdo->prepare($upsertSql);
    $upsertStmt->execute([$user_id, $timer['kpsid'], $diff, $diff]);
    $totalSql = "SELECT alltime FROM ToTaL WHERE userid = ? AND kpsid = ?";
    $totalStmt = $pdo->prepare($totalSql);
    $totalStmt->execute([$user_id, $timer['kpsid']]);
    $total = $totalStmt->fetchColumn();

    return ['success' => true, 'duration' => $diff, 'totalTime' => (int)$total];
}

try {
    switch ($action) {
        case 'getAllKPS':
            $configSql = "SELECT subjects FROM AppConfig WHERE userid = ? AND id = 'main'";
            $configStmt = $pdo->prepare($configSql);
            $configStmt->execute([$user_id]);
            $configJson = $configStmt->fetchColumn();

            $result = [];
            if ($configJson) {
                $subjects = json_decode($configJson, true);
                if (is_array($subjects) && !empty($subjects)) {
                    $allKpsIds = [];
                    $subjectMap = [];
                    foreach ($subjects as $subject) {
                        $key = $subject['key'] ?? '';
                        $displayName = $subject['displayName'] ?? $key;
                        $kpsIds = $subject['kps'] ?? [];
                        if (!empty($key) && !empty($kpsIds)) {
                            $subjectMap[$key] = [
                                'displayName' => $displayName,
                                'kpsIds' => $kpsIds
                            ];
                            $allKpsIds = array_merge($allKpsIds, $kpsIds);
                        }
                    }

                    if (!empty($allKpsIds)) {
                        $allKpsIds = array_unique($allKpsIds);
                        $placeholders = implode(',', array_fill(0, count($allKpsIds), '?'));
                        $sql = "SELECT uniqueId, subject, name, clickCount 
                                FROM KPs 
                                WHERE userid = ? AND uniqueId IN ($placeholders) AND deleted = 0";
                        $stmt = $pdo->prepare($sql);
                        $params = array_merge([$user_id], $allKpsIds);
                        $stmt->execute($params);
                        $kpsList = $stmt->fetchAll(PDO::FETCH_ASSOC);

                        $kpsMap = [];
                        foreach ($kpsList as $kps) {
                            $kpsMap[$kps['uniqueId']] = $kps;
                        }

                        foreach ($subjectMap as $key => $info) {
                            $groupKps = [];
                            foreach ($info['kpsIds'] as $kpsId) {
                                if (isset($kpsMap[$kpsId])) {
                                    $groupKps[] = $kpsMap[$kpsId];
                                }
                            }
                            if (!empty($groupKps)) {
                                $result[] = [
                                    'subjectKey'  => $key,
                                    'displayName' => $info['displayName'],
                                    'kps'         => $groupKps
                                ];
                            }
                        }
                    }
                }
            }
            echo json_encode($result);
            break;
        case 'getCurrentTimer':
            $sql = "SELECT t.id, t.kpsid, t.start_time, k.subject AS subjectKey, k.name AS kpsName
                    FROM ToTaLLog t
                    JOIN KPs k ON t.kpsid = k.uniqueId AND t.userid = k.userid
                    WHERE t.userid = ? AND t.end_time IS NULL";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_id]);
            $timer = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($timer) {
$dt = new DateTime($timer['start_time'], new DateTimeZone('UTC'));
$timer['start_time'] = $dt->format('Y-m-d\TH:i:s.v\Z');
                $map = getSubjectDisplayMap($pdo, $user_id);
                $timer['displayName'] = $map[$timer['subjectKey']] ?? $timer['subjectKey'];
                echo json_encode($timer);
            } else {
                echo json_encode(null);
            }
            break;
        case 'start':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $kpsId = $input['kpsId'] ?? null;
            if (!$kpsId) {
                echo json_encode(['error' => 'Missing kpsId']);
                exit;
            }
            $sql = "SELECT 1 FROM KPs WHERE userid = ? AND uniqueId = ? AND deleted = 0";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_id, $kpsId]);
            if (!$stmt->fetchColumn()) {
                echo json_encode(['error' => 'KPS not found']);
                exit;
            }
            $activeSql = "SELECT id FROM ToTaLLog WHERE userid = ? AND end_time IS NULL";
            $activeStmt = $pdo->prepare($activeSql);
            $activeStmt->execute([$user_id]);
            $activeId = $activeStmt->fetchColumn();
            if ($activeId) {
                $stopResult = stopTimer($pdo, $user_id, $activeId);
                if (!$stopResult['success']) {
                    echo json_encode(['error' => 'Failed to stop existing timer']);
                    exit;
                }
            }
            $startTime = gmdate('Y-m-d H:i:s.v');
            $insertSql = "INSERT INTO ToTaLLog (userid, kpsid, start_time) VALUES (?, ?, ?)";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([$user_id, $kpsId, $startTime]);
            $timerId = $pdo->lastInsertId();
$dt = new DateTime($startTime, new DateTimeZone('UTC'));
            echo json_encode(['success' => true, 'timerId' => $timerId, 'startTime' => $dt->format('Y-m-d\TH:i:s.v\Z')]);
            break;
        case 'stop':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $timerId = $input['timerId'] ?? null;
            if (!$timerId) {
                echo json_encode(['error' => 'Missing timerId']);
                exit;
            }
            $result = stopTimer($pdo, $user_id, $timerId);
            echo json_encode($result);
            break;
        case 'getTasks':
            $date = $_GET['date'] ?? gmdate('Y-m-d');
            $sql = "SELECT dp.id AS taskId, dp.date, dp.kpsId, k.name AS kpsName, k.subject AS subjectKey, dp.content, dp.tag
                    FROM DailyPlans dp
                    LEFT JOIN KPs k ON dp.kpsId = k.uniqueId AND dp.userid = k.userid
                    WHERE dp.userid = ? AND dp.date = ? AND dp.deleted = 0 AND dp.status IS NULL";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_id, $date]);
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $map = getSubjectDisplayMap($pdo, $user_id);
            foreach ($tasks as &$task) {
                $task['displayName'] = $map[$task['subjectKey']] ?? $task['subjectKey'];
            }
            echo json_encode($tasks);
            break;
        case 'getStats':
            $sql = "SELECT t.kpsid, k.subject, k.name, t.alltime
                    FROM ToTaL t
                    LEFT JOIN KPs k ON t.kpsid = k.uniqueId AND t.userid = k.userid
                    WHERE t.userid = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_id]);
            $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $grouped = [];
            $totalSeconds = 0;
            foreach ($stats as $row) {
                $subj = $row['subject'] ?? 'unknown';
                if (!isset($grouped[$subj])) {
                    $grouped[$subj] = ['total' => 0, 'kps' => []];
                }
                $grouped[$subj]['total'] += $row['alltime'];
                $totalSeconds += $row['alltime'];
                $grouped[$subj]['kps'][] = [
                    'name' => $row['name'] ?? 'Unknown',
                    'time' => $row['alltime']
                ];
            }
            $displayMap = getSubjectDisplayMap($pdo, $user_id);

            $result = [];
            foreach ($grouped as $key => $data) {
                $result[] = [
                    'subjectKey'    => $key,
                    'displayName'   => $displayMap[$key] ?? $key,
                    'totalSeconds'  => $data['total'],
                    'kps'           => $data['kps']
                ];
            }
            echo json_encode(['totalSeconds' => $totalSeconds, 'subjects' => $result]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}