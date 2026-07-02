<?php
// backend/src/handlers/save_record.php
// Save a single question record
$img_path = $_POST['img_path'] ?? '';
$key_coords = $_POST['key_coords'] ?? '';
$subject_code = intval($_POST['subject_code'] ?? 0);
$kps = $_POST['kps'] ?? '';

// require upload role for creating new records
require_role('upload');

if (!$img_path || !$key_coords || !$subject_code) {
    echo json_encode(['success' => 0, 'error' => 'Missing parameters']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO myfqs (img_path, key_coords, subject_code, kps) VALUES (?, ?, ?, ?)');
$stmt->execute([$img_path, $key_coords, $subject_code, $kps]);
$id = $pdo->lastInsertId();

// Attempt to auto-generate masked image for new records if missing
$script = realpath($_SERVER['SCRIPT_FILENAME'] ?? '') ?: __FILE__;
$scriptDir = dirname($script);
$fqsRoot = dirname($scriptDir, 1);
$uploadsDir = $fqsRoot . DIRECTORY_SEPARATOR . 'uploads';
$fname = basename($img_path);
$img_fs = $uploadsDir . DIRECTORY_SEPARATOR . $fname;
$masked_fname = preg_replace('/(\.[a-zA-Z]+)$/', '_masked$1', $fname);
$masked_fs = $uploadsDir . DIRECTORY_SEPARATOR . $masked_fname;
if (!file_exists($masked_fs) && file_exists($img_fs)) {
    $boxes = parse_groups($key_coords);
    @mkdir(dirname($masked_fs), 0755, true);
    $new = mask_image_with_boxes($img_fs, $boxes, $masked_fs);
    if ($new) {
        // nothing else to do; file created
    }
}

echo json_encode(['success' => 1, 'id' => $id]);
