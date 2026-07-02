<?php
// backend/src/handlers/update_record.php
// Update an existing question record (subject, kps, key_coords)

require_role('edit');

$id = intval($_POST['id'] ?? $_REQUEST['id'] ?? 0);
if (!$id) { echo json_encode(['success'=>0,'error'=>'Missing id']); exit; }

$fields = [];
$params = [];
if (isset($_POST['subject_code']) || isset($_REQUEST['subject_code'])) {
    $fields[] = 'subject_code = ?';
    $params[] = intval($_POST['subject_code'] ?? $_REQUEST['subject_code']);
}
if (isset($_POST['kps']) || isset($_REQUEST['kps'])) {
    $fields[] = 'kps = ?';
    $params[] = $_POST['kps'] ?? $_REQUEST['kps'];
}
if (isset($_POST['key_coords']) || isset($_REQUEST['key_coords'])) {
    $fields[] = 'key_coords = ?';
    $params[] = $_POST['key_coords'] ?? $_REQUEST['key_coords'];
}

if (empty($fields)) { echo json_encode(['success'=>0,'error'=>'Nothing to update']); exit; }

$params[] = $id;
$sql = 'UPDATE myfqs SET ' . implode(', ', $fields) . ' WHERE id = ?';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

echo json_encode(['success'=>1,'id'=>$id]);
