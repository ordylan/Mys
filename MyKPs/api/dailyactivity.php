<?php
// // // // // // Note // // // // // //
// Temporary hard-coded activity candidates for testing. Generalize this later.
// Subjects: 12=Math, 13=English, 10=Computer. Tags: RV, R1/R2, RT.
// 这里考虑到用户比较少所以道具等静态信息存在sql, 本不应该存那里的!
// 为了方便  我们还在获取任务表实时获取进度 导致大量sql查询 开销大! 实际上应该是在学习记录更新时同步更新任务状态!
// 前端传入一个任务id?--骗人的!反正后端也不用  (bug 传入123abc也会解读为123)
// // // // // // Note // // // // // //
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');


if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$userId = authenticate();
$pdo = getDB();
$utc = new DateTimeZone('UTC');
$businessTimezone = new DateTimeZone('Asia/Shanghai');
$now = new DateTimeImmutable('now', $utc);
$today = $now->setTimezone($businessTimezone);
$period = ($_GET['period'] ?? 'daily') === 'weekly' ? 'weekly' : 'daily';

function activityPeriodStart(DateTimeImmutable $now, $period) {
    $dayStart = $now->setTime(5, 0, 0);
    $activityDay = $now < $dayStart ? $now->modify('-1 day') : $now;
    if ($period === 'daily') {
        return $activityDay->setTime(5, 0, 0);
    }
    return $activityDay->modify('monday this week')->setTime(5, 0, 0);
}

$taskStartDate = activityPeriodStart($today, $period);
$taskStart = $taskStartDate->setTimezone($utc)->format('Y-m-d H:i:s');
$expiresAt = ($period === 'weekly' ? $taskStartDate->modify('+7 days') : $taskStartDate->modify('+1 day'))
    ->setTimezone($utc)->format('Y-m-d H:i:s');

function dailyActivityJson($value) {
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function randomPick($items, $fallback = null) {
    if (empty($items)) return $fallback;
    return $items[random_int(0, count($items) - 1)];
}

function randomMaybe($items) {
    return random_int(0, 1) === 1 ? randomPick($items) : null;
}

function activityCandidates(PDO $pdo, $userId) {
    $config = $pdo->prepare('SELECT subjects FROM AppConfig WHERE userid = ? AND id = ? LIMIT 1');
    $config->execute([$userId, 'main']);
    $configuredSubjects = json_decode((string)$config->fetchColumn(), true);
    $subjectKeys = [];
    if (is_array($configuredSubjects)) {
        foreach ($configuredSubjects as $subject) {
            $key = trim((string)($subject['key'] ?? ''));
            if ($key === '' || in_array(strtolower($key), ['others', 'enjoy'], true)) continue;
            $subjectKeys[] = $key;
        }
        $subjectKeys = array_values(array_unique($subjectKeys));
    }
    if (!$subjectKeys) {
        $subjectKeys = [''];
    }

    $tags = $pdo->prepare(
        'SELECT DISTINCT tag
         FROM DailyPlans
         WHERE userid = ? AND deleted = 0 AND tag IS NOT NULL AND tag <> ?'
    );
    $tags->execute([$userId, '']);
    $tagValues = array_values(array_filter(array_map('strval', $tags->fetchAll(PDO::FETCH_COLUMN))));
    if (!$tagValues) {
        $tagValues = [''];
    }
    return [$subjectKeys, $tagValues];
}

function subjectDisplayMap(PDO $pdo, $userId) {
    $map = [];
    $stmt = $pdo->prepare('SELECT subjects FROM AppConfig WHERE userid = ? AND id = ? LIMIT 1');
    $stmt->execute([$userId, 'main']);
    $subjects = json_decode((string)$stmt->fetchColumn(), true);
    if (is_array($subjects)) {
        foreach ($subjects as $subject) {
            $key = trim((string)($subject['key'] ?? ''));
            if ($key === '' || in_array(strtolower($key), ['others', 'enjoy'], true)) continue;
            $map[$key] = (string)($subject['displayName'] ?? $key);
        }
    }
    return $map;
}

function qualityColor($quality) {
    $colors = [1 => '#8b949e', 2 => '#3fb950', 3 => '#388bfd', 4 => '#a371f7', 5 => '#f0883e'];
    return $colors[max(1, min(5, (int)$quality))] ?? $colors[1];
}

function rewardDefinitions(PDO $pdo, $rewards) {
    $codes = array_values(array_unique(array_filter(array_map(function ($reward) {
        return (string)($reward['code'] ?? '');
    }, $rewards))));
    if (!$codes) return [];
    $placeholders = implode(',', array_fill(0, count($codes), '?'));
    $stmt = $pdo->prepare("SELECT code, name, icon, quality FROM Act_prop_def WHERE status = 1 AND code IN ($placeholders)");
    $stmt->execute($codes);
    $definitions = [];
    foreach ($stmt->fetchAll() as $definition) {
        $definitions[$definition['code']] = $definition;
    }
    return $definitions;
}

function randomDailyTask($type, $subjects, $tags) {
    $subject = randomMaybe($subjects);
    if ($type === 'cumulative') {
        return ['type' => $type, 'subject' => $subject,
            'duration_min' => random_int(123, 188), 'time_start' => randomPick(['05:00', '08:00', '12:00']),
            'time_end' => randomPick(['18:00', '22:00', '24:00'])];
    }
    if ($type === 'persistent') {
        return ['type' => $type, 'subject' => $subject,
            'continuous_min' => random_int(45, 60), 'count' => random_int(1, 2),
            'time_start' => randomPick(['05:00', '08:00', '12:00']), 'time_end' => randomPick(['18:00', '22:00', '24:00'])];
    }
    if ($type === 'entertainment') {
        $min = random_int(5, 15);
        return ['type' => $type, 'study_threshold' => random_int(45, 120), 'subject' => 'enjoy',
            'duration_min' => $min, 'duration_max' => random_int($min + 10, 60)];
    }
    if ($type === 'fulfillment') {
        return ['type' => $type, 'subject' => $subject, 'relative_rate' => random_int(51, 95)];
    }
    if ($type === 'love_learning1') {
        return ['type' => $type, 'study_min' => random_int(120, 288), 'entertainment_ratio' => random_int(30, 48)];
    }
    return ['type' => 'love_learning2', 'relative_rate' => random_int(51, 80)];
}

function randomWeeklyTask($type, $subjects, $tags) {
    $subject = randomMaybe($subjects);
    if ($type === 'cumulative') {
        return ['type' => $type, 'subject' => $subject, 'duration_min' => random_int(200, 588)];
    }
    if ($type === 'persistent') {
        return ['type' => $type, 'subject' => $subject, 'continuous_min' => random_int(37, 60), 'count' => random_int(4, 8)];
    }
    if ($type === 'love_learning1') {
        return ['type' => $type, 'study_min' => random_int(688, 1288), 'entertainment_ratio' => random_int(37, 49)];
    }
    if ($type === 'fulfillment_total') {
        return ['type' => $type, 'relative_rate' => random_int(51, 80)];
    }
    if ($type === 'love_learning2') {
        return ['type' => $type, 'days' => random_int(4, 6), 'daily_study_min' => random_int(166, 222)];
    }
    return ['type' => 'fulfillment_daily', 'days' => random_int(2, 5), 'relative_rate' => random_int(60, 84)];
}

function dailyActivityConfig(PDO $pdo, $userId, $period = 'daily') {
    [$subjects, $tags] = activityCandidates($pdo, $userId);
    if ($period === 'weekly') {
        $types = ['cumulative', 'persistent', 'love_learning1', 'fulfillment_total', 'fulfillment_daily', 'love_learning2'];
        $tasks = [];
        foreach ($types as $type) {
            $tasks[] = randomWeeklyTask($type, $subjects, $tags);
        }
        return [
            'title' => 'Weekly Activity Pack',
            'description' => 'Complete 4 of 6 activities to claim this week\'s gift.',
            'required' => 4,
            'tasks' => $tasks,
            'award' => [['code' => 'weekly_reward_box', 'quantity' => 1], ['code' => 'waiver_slip', 'quantity' => 1], ['code' => 'parameter', 'quantity' => 68]]
        ];
    }
    $types = ['cumulative', 'persistent', 'entertainment', 'fulfillment', 'love_learning1', 'love_learning2'];
    shuffle($types);
    $tasks = [];
    foreach (array_slice($types, 0, 4) as $type) {
        $tasks[] = randomDailyTask($type, $subjects, $tags);
    }
    return [
        'title' => 'Daily Activity Pack',
        'description' => 'Complete 3 of 4 activities to claim today\'s gift.',
        'required' => 3,
        'tasks' => $tasks,
        'award' => [
            ['code' => 'daily_reward_box', 'quantity' => 1],
            ['code' => 'parameter', 'quantity' => 18]
        ]
    ];
}

function normalizeActivityTask(PDO $pdo, $task) {
    $config = json_decode($task['config'], true);
    if (!is_array($config) || !isset($config['tasks']) || !is_array($config['tasks'])) return $task;
    $changed = false;
    foreach ($config['tasks'] as &$condition) {
        if (array_key_exists('tag', $condition)) {
            unset($condition['tag']);
            $changed = true;
        }
    }
    unset($condition);
    if ($changed) {
        $update = $pdo->prepare('UPDATE Act_task SET config = ? WHERE id = ?');
        $update->execute([dailyActivityJson($config), $task['id']]);
        $task['config'] = dailyActivityJson($config);
    }
    return $task;
}

function conditionText($condition, $subjectNames = []) {
    $type = $condition['type'] ?? '';
    if ($type === 'entertainment') {
        return 'Study for ' . (int)$condition['study_threshold'] . ' minutes, then enjoy '
            . (int)$condition['duration_min'] . '-' . (int)$condition['duration_max'] . ' minutes';
    }
    $subjectKey = (string)($condition['subject'] ?? '');
    $subject = $subjectKey !== '' ? ' for subject ' . ($subjectNames[$subjectKey] ?? $subjectKey) : '';
    $window = (!empty($condition['time_start']) && !empty($condition['time_end'])) ? ' between ' . $condition['time_start'] . ' and ' . $condition['time_end'] : '';
    if ($type === 'cumulative') return 'Learn' . $subject . $window . ' for ' . (int)$condition['duration_min'] . ' minutes';
    if ($type === 'persistent') return 'Learn' . $subject . $window . ' continuously for ' . (int)$condition['continuous_min'] . ' minutes, ' . (int)$condition['count'] . ' time' . ((int)$condition['count'] === 1 ? '' : 's');
    if ($type === 'fulfillment') return 'Reach ' . (int)$condition['relative_rate'] . '% completion' . $subject;
    if ($type === 'fulfillment_total') return 'Reach ' . (int)$condition['relative_rate'] . '% total task completion';
    if ($type === 'fulfillment_daily') return 'Reach ' . (int)$condition['relative_rate'] . '% completion on ' . (int)$condition['days'] . ' days';
    if ($type === 'love_learning1') return 'Keep entertainment at or below ' . (int)$condition['entertainment_ratio'] . '% of study time and study for ' . (int)$condition['study_min'] . ' minutes';
    if ($type === 'love_learning2') {
        if (array_key_exists('daily_study_min', $condition)) {
            return 'Study at least ' . (int)$condition['daily_study_min'] . ' minutes on ' . (int)$condition['days'] . ' days';
        }
        return 'Reach ' . (int)$condition['relative_rate'] . '% task completion';
    }
    return '';
}

function rewardText($reward) {
    $quantity = max(1, (int)($reward['quantity'] ?? 1));
    return $quantity . ' x ' . trim((string)($reward['name'] ?? $reward['code'] ?? 'Reward'));
}

function getUserPropQuantity(PDO $pdo, $userId, $code) {
    $stmt = $pdo->prepare(
        'SELECT mp.quantity
         FROM Act_myprops mp
         JOIN Act_prop_def pd ON pd.id = mp.prop_id
         WHERE mp.userid = ? AND pd.code = ? AND pd.status = 1
         LIMIT 1'
    );
    $stmt->execute([$userId, $code]);
    $quantity = $stmt->fetchColumn();
    return $quantity === false ? 0 : max(0, (int)$quantity);
}

function getUserBag(PDO $pdo, $userId) {
    $stmt = $pdo->prepare(
        'SELECT pd.code, pd.name, pd.description, pd.icon, pd.quality, pd.type_id, mp.quantity
         FROM Act_myprops mp
         JOIN Act_prop_def pd ON pd.id = mp.prop_id
         WHERE mp.userid = ? AND mp.quantity > 0 AND pd.status = 1 AND pd.type_id <> 6
         ORDER BY pd.quality DESC, pd.name ASC'
    );
    $stmt->execute([$userId]);
    return array_map(function ($item) {
        $item['quality'] = max(1, min(5, (int)$item['quality']));
        $item['quantity'] = max(0, (int)$item['quantity']);
        $item['type_id'] = (int)$item['type_id'];
        $item['color'] = qualityColor($item['quality']);
        return $item;
    }, $stmt->fetchAll());
}

function getOrCreateDailyTask(PDO $pdo, $userId, $period, $taskStart, $expiresAt) {
    $lockName = 'activity:' . $userId . ':' . $period . ':' . substr($taskStart, 0, 10);
    $lock = $pdo->prepare('SELECT GET_LOCK(?, 5)');
    $lock->execute([$lockName]);
    if ((int)$lock->fetchColumn() !== 1) {
        throw new RuntimeException('Could not lock daily activity');
    }

    try {
        $select = $pdo->prepare(
            'SELECT * FROM Act_task WHERE userid = ? AND period_type = ? AND task_start = ? LIMIT 1'
        );
            $select->execute([$userId, $period, $taskStart]);
        $task = $select->fetch();
        if ($task) {
            return normalizeActivityTask($pdo, $task);
        }

        $config = dailyActivityConfig($pdo, $userId, $period);
        $insert = $pdo->prepare(
            'INSERT INTO Act_task
                (userid, period_type, task_start, expires_at, task_type, config)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            $userId,
            $period,
            $taskStart,
            $expiresAt,
            $period . '_bundle',
            dailyActivityJson($config)
        ]);

        $select->execute([$userId, $period, $taskStart]);
        return $select->fetch();
    } finally {
        $unlock = $pdo->prepare('SELECT RELEASE_LOCK(?)');
        $unlock->execute([$lockName]);
    }
}

function getActivityProgress(PDO $pdo, $userId, $start, $end) {
    $logs = $pdo->prepare(
        'SELECT l.kpsid, l.start_time, l.end_time, k.subject, k.name
         FROM ToTaLLog l
         JOIN KPs k ON k.userid = l.userid AND k.uniqueId = l.kpsid
                   AND (k.deleted = 0 OR k.deleted IS NULL)
                 WHERE l.userid = ? AND l.end_time IS NOT NULL
                     AND l.start_time >= ? AND l.start_time < ?
         ORDER BY l.start_time'
    );
        $logs->execute([$userId, $start, $end]);
    $sessions = [];
    foreach ($logs->fetchAll() as $row) {
        $sessionStart = (new DateTimeImmutable($row['start_time'], new DateTimeZone('UTC')))->getTimestamp();
        $sessionEnd = (new DateTimeImmutable($row['end_time'], new DateTimeZone('UTC')))->getTimestamp();
        if ($sessionStart === false || $sessionEnd === false || $sessionEnd <= $sessionStart) continue;
        $sessions[] = [
            'start' => $sessionStart,
            'end' => $sessionEnd,
            'minutes' => ($sessionEnd - $sessionStart) / 60,
            'subject' => (string)($row['subject'] ?? ''),
            'name' => (string)($row['name'] ?? '')
        ];
    }

    $plans = $pdo->prepare(
        'SELECT p.date, p.category AS subject, p.tag, p.status
         FROM DailyPlans p
            WHERE p.userid = ? AND p.date >= ? AND p.date < ? AND (p.deleted = 0 OR p.deleted IS NULL)'
    );
        $startDate = (new DateTimeImmutable($start, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Asia/Shanghai'))->format('Y-m-d');
        $endDate = (new DateTimeImmutable($end, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Asia/Shanghai'))->format('Y-m-d');
        $plans->execute([$userId, $startDate, $endDate]);
    $planRows = $plans->fetchAll();
    $planTotal = count($planRows);
    $planDone = count(array_filter($planRows, function ($row) { return (string)$row['status'] === '1'; }));

    return ['sessions' => $sessions, 'plans' => $planRows, 'plan_total' => $planTotal, 'plan_done' => $planDone];
}

function planCompletionRate($plans, $condition) {
    $matching = array_filter($plans, function ($plan) use ($condition) {
        if (!empty($condition['subject']) && (string)$plan['subject'] !== (string)$condition['subject']) return false;
        return true;
    });
    if (count($matching) === 0) return 0;
    $score = 0.0;
    foreach ($matching as $plan) {
        if ((string)$plan['status'] === '1') $score += 1.0;
        elseif ((string)$plan['status'] === '0') $score += 0.5;
    }
    return (int)floor($score * 100 / count($matching));
}

function formatTask(PDO $pdo, $task, $today, $userId) {
    $config = json_decode($task['config'], true);
    if (!is_array($config)) {
        throw new RuntimeException('Invalid task configuration');
    }
    $progress = getActivityProgress($pdo, $userId, $task['task_start'], $task['expires_at']);
    $conditions = [];
    $subjectNames = subjectDisplayMap($pdo, $userId);
    $completeCount = 0;
    foreach (($config['tasks'] ?? []) as $condition) {
        $type = $condition['type'] ?? '';
        $progressText = null;
        $text = conditionText($condition, $subjectNames);
        if ($text === '') {
            continue;
        }
        $matching = array_filter($progress['sessions'], function ($session) use ($condition) {
            if (!empty($condition['subject']) && (string)$session['subject'] !== (string)$condition['subject']) return false;
            if (isset($condition['time_start'], $condition['time_end'])) {
                $start = (new DateTimeImmutable('@' . $session['start']))
                    ->setTimezone(new DateTimeZone('Asia/Shanghai'))->format('H:i');
                if ($start < $condition['time_start'] || $start >= $condition['time_end']) return false;
            }
            return true;
        });
        $minutes = array_sum(array_column($matching, 'minutes'));
        $target = max(1, (int)($condition['duration_min'] ?? $condition['continuous_min'] ?? 1));
        $current = (int)floor($minutes);
        if ($type === 'persistent') {
            $qualified = array_filter($matching, function ($session) use ($condition) { return $session['minutes'] >= (int)$condition['continuous_min']; });
            $current = count($qualified);
            $target = max(1, (int)$condition['count']);
        } elseif ($type === 'entertainment') {
            $current = 0;
            foreach ($matching as $enjoySession) {
                if ($enjoySession['minutes'] < (int)$condition['duration_min']
                    || $enjoySession['minutes'] > (int)$condition['duration_max']) {
                    continue;
                }
                $studyMinutesBeforeEnjoy = 0;
                foreach ($progress['sessions'] as $studySession) {
                    if ($studySession['subject'] !== 'enjoy' && $studySession['end'] <= $enjoySession['start']) {
                        $studyMinutesBeforeEnjoy += $studySession['minutes'];
                    }
                }
                if ($studyMinutesBeforeEnjoy >= (int)$condition['study_threshold']) {
                    $current = 1;
                    break;
                }
            }
            $target = 1;
        } elseif ($type === 'fulfillment') {
            $current = planCompletionRate($progress['plans'], $condition);
            $target = (int)$condition['relative_rate'];
        } elseif ($type === 'fulfillment_total') {
            $current = planCompletionRate($progress['plans'], []);
            $target = (int)$condition['relative_rate'];
        } elseif ($type === 'fulfillment_daily') {
            $dailyPlans = [];
            foreach ($progress['plans'] as $plan) {
                $planDate = (string)$plan['date'];
                $dailyPlans[$planDate][] = $plan;
            }
            $current = 0;
            foreach ($dailyPlans as $dayPlans) {
                if (planCompletionRate($dayPlans, []) >= (int)$condition['relative_rate']) $current++;
            }
            $target = (int)$condition['days'];
        } elseif ($type === 'love_learning1') {
            $studyMinutes = array_sum(array_map(function ($session) { return $session['subject'] === 'enjoy' ? 0 : $session['minutes']; }, $progress['sessions']));
            $entertainmentMinutes = array_sum(array_map(function ($session) { return $session['subject'] === 'enjoy' ? $session['minutes'] : 0; }, $progress['sessions']));
            $ratio = $studyMinutes > 0 ? (int)floor($entertainmentMinutes * 100 / $studyMinutes) : 0;
            $current = $studyMinutes >= (int)$condition['study_min'] && $ratio <= (int)$condition['entertainment_ratio'] ? 1 : 0;
            $target = 1;
            $progressText = 'Study ' . (int)floor($studyMinutes) . '/' . (int)$condition['study_min'] . ' min; entertainment ' . $ratio . '%/' . (int)$condition['entertainment_ratio'] . '%';
        } elseif ($type === 'love_learning2') {
            if (array_key_exists('daily_study_min', $condition)) {
                $dailyStudyMinutes = [];
                foreach ($progress['sessions'] as $session) {
                    if ($session['subject'] === 'enjoy') continue;
                    $localStart = (new DateTimeImmutable('@' . $session['start']))
                        ->setTimezone(new DateTimeZone('Asia/Shanghai'));
                    $studyDay = $localStart->format('H:i') < '05:00'
                        ? $localStart->modify('-1 day')->format('Y-m-d')
                        : $localStart->format('Y-m-d');
                    $dailyStudyMinutes[$studyDay] = ($dailyStudyMinutes[$studyDay] ?? 0) + $session['minutes'];
                }
                $dailyTarget = (int)$condition['daily_study_min'];
                $current = count(array_filter($dailyStudyMinutes, function ($minutes) use ($dailyTarget) {
                    return $minutes >= $dailyTarget;
                }));
                $target = (int)$condition['days'];
                $progressText = $current . '/' . $target . ' days (' . $dailyTarget . ' min/day)';
            } else {
                $current = planCompletionRate($progress['plans'], []);
                $target = (int)$condition['relative_rate'];
            }
        }
        $complete = $current >= $target;
        if ($complete) $completeCount++;
        $conditions[] = [
            'text' => $text,
            'subject' => $condition['subject'] ?? null,
            'subject_name' => !empty($condition['subject']) ? ($subjectNames[(string)$condition['subject']] ?? (string)$condition['subject']) : null,
            'current' => $current,
            'target' => $target,
            'progress_text' => $progressText ?? ($current . '/' . $target . (($type === 'fulfillment' || $type === 'love_learning2') ? '%' : '')),
            'completed' => $complete
        ];
    }

    $rewards = [];
    $rewardDefinitions = rewardDefinitions($pdo, $config['award'] ?? []);
    foreach (($config['award'] ?? []) as $reward) {
        if (($reward['code'] ?? '') === 'daily_streak') continue;
        $definition = $rewardDefinitions[(string)($reward['code'] ?? '')] ?? [];
        $text = rewardText($reward);
        if ($text !== '') {
            $rewards[] = [
                'code' => (string)($reward['code'] ?? ''),
                'name' => (string)($definition['name'] ?? $reward['name'] ?? $reward['code'] ?? 'Reward'),
                'icon' => (string)($definition['icon'] ?? ''),
                'quality' => max(1, min(5, (int)($definition['quality'] ?? 1))),
                'color' => qualityColor($definition['quality'] ?? 1),
                'quantity' => max(1, (int)($reward['quantity'] ?? 1)),
                'text' => max(1, (int)($reward['quantity'] ?? 1)) . ' x ' . trim((string)($definition['name'] ?? $reward['name'] ?? $reward['code'] ?? 'Reward'))
            ];
        }
    }

    return [
        'id' => (int)$task['id'],
        'period' => $task['period_type'],
        'title' => (string)($config['title'] ?? 'Daily activity'),
        'description' => (string)($config['description'] ?? ''),
        'conditions' => $conditions,
        'condition_text' => implode(' and ', array_column($conditions, 'text')),
        'rewards' => $rewards,
        'reward_text' => implode(', ', array_column($rewards, 'text')),
        'completed' => $completeCount >= (int)($config['required'] ?? count($conditions)),
        'claimed' => (bool)$task['is_completed'],
        'streak_days' => getDailyStreak($pdo, $userId, $today),
        'note_count' => getUserPropQuantity($pdo, $userId, 'waiver_slip'),
        'task_start' => $task['task_start'],
        'expires_at' => $task['expires_at']
    ];
}

function dailyStreakWindow(DateTimeImmutable $today) {
    $currentStart = activityPeriodStart($today, 'daily')->setTimezone(new DateTimeZone('UTC'));
    return [$currentStart, $currentStart->modify('-1 day')];
}

function getDailyStreak(PDO $pdo, $userId, $today) {
    $stmt = $pdo->prepare(
        'SELECT mp.prop_id, mp.quantity, mp.updated_at
         FROM Act_myprops mp
         JOIN Act_prop_def pd ON pd.id = mp.prop_id
         WHERE mp.userid = ? AND pd.code = ? AND pd.status = 1
         LIMIT 1'
    );
    $stmt->execute([$userId, 'daily_streak']);
    $streak = $stmt->fetch();
    if (!$streak || empty($streak['updated_at'])) return 0;

    [, $previousStart] = dailyStreakWindow($today);
    $updatedAt = new DateTimeImmutable($streak['updated_at'], new DateTimeZone('UTC'));
    if ($updatedAt < $previousStart) {
        $before = (int)$streak['quantity'];
        $reset = $pdo->prepare(
            'UPDATE Act_myprops
               SET quantity = 0, updated_at = ?
             WHERE userid = ? AND prop_id = ?'
        );
           $reset->execute([gmdate('Y-m-d H:i:s'), $userId, $streak['prop_id']]);
        $log = $pdo->prepare(
            'INSERT INTO Act_prop_log
                (userid, prop_id, change_type, change_quantity, before_quantity, reason, ref_id)
             VALUES (?, ?, 4, ?, ?, ?, 20)'
        );
        $log->execute([$userId, $streak['prop_id'], -$before, $before, 'daily_streak_reset']);
        return 0;
    }
    return max(0, (int)$streak['quantity']);
}

try {
    if (($_GET['action'] ?? '') === 'bag') {
        echo json_encode(['items' => getUserBag($pdo, $userId)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    $task = getOrCreateDailyTask($pdo, $userId, $period, $taskStart, $expiresAt);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if ((int)($input['task_id'] ?? 0) !== (int)$task['id']) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid task']);
            exit;
        }
        $view = formatTask($pdo, $task, $today, $userId);
        $useWaiver = $period === 'daily' && !empty($input['use_waiver']);
        if (!$view['completed'] && !$useWaiver) {
            http_response_code(409);
            $required = (int)($view['period'] === 'weekly' ? 4 : 3);
            $total = $view['period'] === 'weekly' ? 6 : 4;
            $message = 'Complete ' . $required . ' of ' . $total . ' activities first';
            if ($period === 'daily') $message .= ', or use one waiver slip';
            echo json_encode(['error' => $message, 'task' => $view]);
            exit;
        }

        $pdo->beginTransaction();
        $lockedTask = $pdo->prepare('SELECT is_completed FROM Act_task WHERE id = ? AND userid = ? FOR UPDATE');
        $lockedTask->execute([$task['id'], $userId]);
        if ((int)$lockedTask->fetchColumn() === 1) {
            $pdo->commit();
            $task['is_completed'] = 1;
            echo json_encode([
                'task' => formatTask($pdo, $task, $today, $userId),
                'message' => 'Reward already claimed'
            ]);
            exit;
        }
        if ($useWaiver && !$view['completed']) {
            $waiver = $pdo->prepare('SELECT id FROM Act_prop_def WHERE code = ? AND status = 1 LIMIT 1');
            $waiver->execute(['waiver_slip']);
            $waiverId = $waiver->fetchColumn();
            if ($waiverId === false) throw new RuntimeException('waiver_slip is not defined');
            $owned = $pdo->prepare('SELECT quantity FROM Act_myprops WHERE userid = ? AND prop_id = ? FOR UPDATE');
            $owned->execute([$userId, $waiverId]);
            $before = (int)$owned->fetchColumn();
            if ($before < 1) {
                $pdo->rollBack();
                http_response_code(409);
                echo json_encode(['error' => 'You do not have a waiver slip', 'task' => $view]);
                exit;
            }
            $consume = $pdo->prepare('UPDATE Act_myprops SET quantity = quantity - 1 WHERE userid = ? AND prop_id = ? AND quantity > 0');
            $consume->execute([$userId, $waiverId]);
            $log = $pdo->prepare(
                'INSERT INTO Act_prop_log
                    (userid, prop_id, change_type, change_quantity, before_quantity, reason, ref_id)
                 VALUES (?, ?, 2, -1, ?, ?, ?)'
            );
            $log->execute([$userId, $waiverId, $before, 'daily_activity_waiver', (string)$task['id']]);
        }
        foreach ($view['rewards'] as $reward) {
            $prop = $pdo->prepare('SELECT id FROM Act_prop_def WHERE code = ? AND status = 1 LIMIT 1');
            $prop->execute([$reward['code']]);
            $propId = $prop->fetchColumn();
            if ($propId === false) {
                throw new RuntimeException('Reward definition is missing: ' . $reward['code']);
            }
            $owned = $pdo->prepare('SELECT quantity FROM Act_myprops WHERE userid = ? AND prop_id = ? FOR UPDATE');
            $owned->execute([$userId, $propId]);
            $before = $owned->fetchColumn();
            $before = $before === false ? 0 : (int)$before;
            $upsert = $pdo->prepare(
                'INSERT INTO Act_myprops (userid, prop_id, quantity) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)'
            );
            $upsert->execute([$userId, $propId, $reward['quantity']]);
            $log = $pdo->prepare(
                'INSERT INTO Act_prop_log
                    (userid, prop_id, change_type, change_quantity, before_quantity, reason, ref_id)
                 VALUES (?, ?, 1, ?, ?, ?, ?)'
            );
            $reason = $period === 'weekly' ? 'weekly_activity' : 'daily_activity';
            $log->execute([$userId, $propId, $reward['quantity'], $before, $reason, (string)$task['id']]);
        }
        if ($period === 'daily') {
            $streakProp = $pdo->prepare('SELECT id FROM Act_prop_def WHERE code = ? AND status = 1 LIMIT 1');
            $streakProp->execute(['daily_streak']);
            $streakPropId = $streakProp->fetchColumn();
            if ($streakPropId === false) throw new RuntimeException('Reward definition is missing: daily_streak');
            $owned = $pdo->prepare('SELECT quantity, updated_at FROM Act_myprops WHERE userid = ? AND prop_id = ? FOR UPDATE');
            $owned->execute([$userId, $streakPropId]);
            $ownedRow = $owned->fetch();
            $before = $ownedRow === false ? 0 : (int)$ownedRow['quantity'];
            [, $previousStart] = dailyStreakWindow($today);
            $lastClaim = $ownedRow && !empty($ownedRow['updated_at'])
                ? new DateTimeImmutable($ownedRow['updated_at'], new DateTimeZone('UTC'))
                : null;
            $streakQuantity = $lastClaim !== null && $lastClaim >= $previousStart ? $before + 1 : 1;
            $updatedAt = $now->format('Y-m-d H:i:s');
            if ($ownedRow === false) {
                $upsert = $pdo->prepare(
                    'INSERT INTO Act_myprops (userid, prop_id, quantity, updated_at) VALUES (?, ?, ?, ?)'
                );
                $upsert->execute([$userId, $streakPropId, $streakQuantity, $updatedAt]);
            } else {
                $upsert = $pdo->prepare(
                    'UPDATE Act_myprops SET quantity = ?, updated_at = ? WHERE userid = ? AND prop_id = ?'
                );
                $upsert->execute([$streakQuantity, $updatedAt, $userId, $streakPropId]);
            }
            $log = $pdo->prepare(
                'INSERT INTO Act_prop_log
                    (userid, prop_id, change_type, change_quantity, before_quantity, reason, ref_id)
                 VALUES (?, ?, 1, ?, ?, ?, ?)'
            );
            $log->execute([$userId, $streakPropId, $streakQuantity - $before, $before, 'daily_activity', (string)$task['id']]);
        }
        $mark = $pdo->prepare('UPDATE Act_task SET is_completed = 1 WHERE id = ? AND userid = ? AND is_completed = 0');
        $mark->execute([$task['id'], $userId]);
        $pdo->commit();
        $task['is_completed'] = 1;
    }

    echo json_encode(['task' => formatTask($pdo, $task, $today, $userId)], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
   // print_r($error);
   if ($pdo->inTransaction()) {
       $pdo->rollBack();
    }
   http_response_code(500);
   echo json_encode(['error' => $error->getMessage()]);
}