<?php
// backend/src/utils.php
// Utility functions

function parse_groups($coord_str) {
    if (!$coord_str) return [];
    $groups = explode('|', $coord_str);
    $result = [];
    foreach ($groups as $g) {
        $parts = array_filter(array_map('trim', explode(',', $g)), function($v){ return $v !== ''; });
        $coords = array_map('intval', $parts);
        if (count($coords) === 4 || count($coords) === 6) {
            $result[] = $coords;
        }
    }
    return $result;
}

function mask_image_with_boxes($img_path, $boxes, $output_path) {
    if (!file_exists($img_path)) {
        return false;
    }
    $data = @file_get_contents($img_path);
    if ($data === false) {
        return false;
    }
    $im = @imagecreatefromstring($data);
    if (!$im) {
        return false;
    }
    $white = imagecolorallocate($im, 255, 255, 255);
    foreach ($boxes as $box) {
        // box may be [x1,y1,x2,y2] or [x1,y1,x2,y2,imgW,imgH]
        if (is_array($box) && count($box) >= 4) {
            $x1 = intval($box[0]);
            $y1 = intval($box[1]);
            $x2 = intval($box[2]);
            $y2 = intval($box[3]);
            imagefilledrectangle($im, $x1, $y1, $x2, $y2, $white);
        }
    }

    $ext = strtolower(pathinfo($output_path, PATHINFO_EXTENSION));
    if (!in_array($ext, ['png', 'jpg', 'jpeg', 'gif'])) {
        $ext = 'png';
        $output_path = preg_replace('/\.[^.]+$/', '.' . $ext, $output_path);
    }

    $saved = false;
    if ($ext === 'png') {
        $saved = imagepng($im, $output_path);
    } elseif ($ext === 'jpg' || $ext === 'jpeg') {
        $saved = imagejpeg($im, $output_path, 90);
    } elseif ($ext === 'gif') {
        $saved = imagegif($im, $output_path);
    }
    imagedestroy($im);
    return $saved ? $output_path : false;
}
