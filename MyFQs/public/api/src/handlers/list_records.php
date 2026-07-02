<?php
// backend/src/handlers/list_records.php
// List question records, filter by subject_code/kps
require_role('view');

$where = [];
$params = [];
if (!empty($_GET['subject_code'])) {
    $where[] = 'subject_code = ?';
    $params[] = intval($_GET['subject_code']);
}
if (!empty($_GET['kps'])) {
    $where[] = 'FIND_IN_SET(?, REPLACE(kps, "||", ","))';
    $params[] = $_GET['kps'];
}
$sql = 'SELECT * FROM myfqs';
if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY id DESC';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
// Attempt to attach masked image path when available
// Resolve filesystem path for uploads
$script = realpath($_SERVER['SCRIPT_FILENAME'] ?? '') ?: __FILE__;
$scriptDir = dirname($script);
$fqsRoot = dirname($scriptDir, 1);
$uploadsDir = $fqsRoot . DIRECTORY_SEPARATOR . 'uploads';

$scriptUrl = $_SERVER['SCRIPT_NAME'] ?? '/api/index.php';
$webBase = dirname(dirname($scriptUrl));
if ($webBase === '/' || $webBase === '.') $webBase = '';

foreach ($rows as &$r) {
    $fname = basename($r['img_path'] ?? '');
    if ($fname) {
        $masked_fname = preg_replace('/(\.[a-zA-Z]+)$/', '_masked$1', $fname);
        $masked_fs = $uploadsDir . DIRECTORY_SEPARATOR . $masked_fname;
        if (file_exists($masked_fs)) {
            $p = $webBase . '/uploads/' . basename($masked_fs);
            if ($p[0] !== '/') $p = '/' . ltrim($p, '/');
            $r['img_path_masked'] = $p;
        }
    }
}

echo json_encode(['success' => 1, 'rows' => $rows]);
