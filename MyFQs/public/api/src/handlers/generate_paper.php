<?php
// backend/src/handlers/generate_paper.php
// Batch get masked images for test paper

require_role('view');

$ids = $_POST['ids'] ?? '';
if (!$ids) {
    echo json_encode(['success' => 0, 'error' => 'Missing ids']);
    exit;
}
$idArr = array_map('intval', explode(',', $ids));
$items = [];
foreach ($idArr as $id) {
    $stmt = $pdo->prepare('SELECT * FROM myfqs WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $img_path = $row['img_path'];
        $key_coords = $row['key_coords'];
        $boxes = parse_groups($key_coords);
        $masked_path = preg_replace('/(\.[a-zA-Z]+)$/', '_masked$1', $img_path);
        if (!file_exists($masked_path)) {
            $new = mask_image_with_boxes($img_path, $boxes, $masked_path);
            if ($new) {
                $masked_path = $new;
            }
        }
        // ensure web-safe paths (existing code expected web paths in list_records)
        $items[] = [
            'id' => (int)$id,
            'masked' => $masked_path,
            'original' => $img_path,
        ];
    }
}
echo json_encode(['success' => 1, 'items' => $items]);
