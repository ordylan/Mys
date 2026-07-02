<?php
// backend/src/handlers/get_crops.php
// Get masked and original cropped image for a question

require_role('view');

$id = intval($_GET['id'] ?? 0);
if (!$id) {
    echo json_encode(['success' => 0, 'error' => 'Missing id']);
    exit;
}
$stmt = $pdo->prepare('SELECT * FROM myfqs WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    echo json_encode(['success' => 0, 'error' => 'Not found']);
    exit;
}
$img_path = $row['img_path'];
$key_coords = $row['key_coords'];
$boxes = parse_groups($key_coords);

// Resolve filesystem path from uploads directory using basename
$script = realpath($_SERVER['SCRIPT_FILENAME'] ?? '') ?: __FILE__;
$scriptDir = dirname($script);
$fqsRoot = dirname($scriptDir, 1);
$uploadsDir = $fqsRoot . DIRECTORY_SEPARATOR . 'uploads';

$fname = basename($img_path);
$img_fs = $uploadsDir . DIRECTORY_SEPARATOR . $fname;
$masked_fname = preg_replace('/(\.[a-zA-Z]+)$/', '_masked$1', $fname);
$masked_fs = $uploadsDir . DIRECTORY_SEPARATOR . $masked_fname;

if (!file_exists($masked_fs)) {
    if (file_exists($img_fs)) {
        $new = mask_image_with_boxes($img_fs, $boxes, $masked_fs);
        if ($new) {
            $masked_fs = $new;
        }
    }
}

$scriptUrl = $_SERVER['SCRIPT_NAME'] ?? '/api/index.php';
$webBase = dirname(dirname($scriptUrl));
if ($webBase === '/' || $webBase === '.') $webBase = '';
$question_masked = $webBase . '/uploads/' . basename($masked_fs);
$question_original = $webBase . '/uploads/' . $fname;
if ($question_masked[0] !== '/') $question_masked = '/' . ltrim($question_masked, '/');
if ($question_original[0] !== '/') $question_original = '/' . ltrim($question_original, '/');

echo json_encode([
    'success' => 1,
    'question_masked' => $question_masked,
    'question_original' => $question_original,
    'key_coords' => $key_coords
]);
