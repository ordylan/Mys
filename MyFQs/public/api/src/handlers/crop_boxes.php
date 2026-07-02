<?php
// backend/src/handlers/crop_boxes.php
// Crop given boxes from an uploaded image and return web paths for the cropped images

// read JSON body
$raw = file_get_contents('php://input');
$json = json_decode($raw, true);
$img_path = $json['img_path'] ?? '';
$boxes = $json['boxes'] ?? [];

require_role('view');

if (!$img_path || !is_array($boxes) || count($boxes) === 0) {
    echo json_encode(['success' => 0, 'error' => 'Missing parameters']);
    exit;
}

// Determine uploads dir (same logic as upload.php)
$script = realpath($_SERVER['SCRIPT_FILENAME'] ?? '') ?: __FILE__;
$scriptDir = dirname($script);
$fqsRoot = dirname($scriptDir, 1);
$uploadsDir = $fqsRoot . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadsDir)) @mkdir($uploadsDir, 0755, true);

// Derive filesystem path for source image based on basename
$fname = basename($img_path);
$srcFs = $uploadsDir . DIRECTORY_SEPARATOR . $fname;
if (!file_exists($srcFs)) {
    echo json_encode(['success' => 0, 'error' => 'Source image not found', 'checked' => $srcFs]);
    exit;
}

$data = @file_get_contents($srcFs);
if ($data === false) { echo json_encode(['success'=>0,'error'=>'Cannot read source']); exit; }
$srcIm = @imagecreatefromstring($data);
if (!$srcIm) { echo json_encode(['success'=>0,'error'=>'Unsupported image']); exit; }

$srcW = imagesx($srcIm);
$srcH = imagesy($srcIm);

$outPaths = [];
$i = 0;
foreach ($boxes as $b) {
    // b expected to contain x1,y1,x2,y2 and maybe imgW,imgH
    $x1 = intval($b['x1'] ?? $b[0] ?? 0);
    $y1 = intval($b['y1'] ?? $b[1] ?? 0);
    $x2 = intval($b['x2'] ?? $b[2] ?? 0);
    $y2 = intval($b['y2'] ?? $b[3] ?? 0);
    $boxImgW = intval($b['imgW'] ?? 0);
    $boxImgH = intval($b['imgH'] ?? 0);

    // scale coordinates to actual source image size if imgW/imgH provided
    if ($boxImgW > 0 && $boxImgH > 0 && ($boxImgW !== $srcW || $boxImgH !== $srcH)) {
        $scaleX = $srcW / $boxImgW;
        $scaleY = $srcH / $boxImgH;
    } else {
        $scaleX = $scaleY = 1;
    }
    $sx = max(0, intval(round($x1 * $scaleX)));
    $sy = max(0, intval(round($y1 * $scaleY)));
    $ex = max(0, intval(round($x2 * $scaleX)));
    $ey = max(0, intval(round($y2 * $scaleY)));
    $cw = max(1, $ex - $sx);
    $ch = max(1, $ey - $sy);

    $crop = imagecreatetruecolor($cw, $ch);
    // preserve transparency for png/gif
    imagealphablending($crop, false);
    imagesavealpha($crop, true);
    $transparent = imagecolorallocatealpha($crop, 0, 0, 0, 127);
    imagefilledrectangle($crop, 0, 0, $cw, $ch, $transparent);

    imagecopyresampled($crop, $srcIm, 0, 0, $sx, $sy, $cw, $ch, $cw, $ch);

    $outName = time() . '_' . bin2hex(random_bytes(4)) . '_crop_' . $i . '.jpg';
    $outFs = $uploadsDir . DIRECTORY_SEPARATOR . $outName;
    imagejpeg($crop, $outFs, 90);
    imagedestroy($crop);
    $outPaths[] = $outName;
    $i++;
}

imagedestroy($srcIm);

// compute web base for returned paths
$scriptUrl = $_SERVER['SCRIPT_NAME'] ?? '/api/index.php';
$webBase = dirname(dirname($scriptUrl));
if ($webBase === '/' || $webBase === '.') $webBase = '';
$webPaths = array_map(function($n) use ($webBase) { $p = $webBase . '/uploads/' . $n; return ($p[0] === '/') ? $p : '/' . ltrim($p, '/'); }, $outPaths);

echo json_encode(['success' => 1, 'crops' => $webPaths]);
