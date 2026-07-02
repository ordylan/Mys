<?php
// backend/src/handlers/upload.php
// Simple file upload handler for images

// upload dir relative to project root: backend/uploads
// Determine uploads directory based on the running front-controller (SCRIPT_FILENAME).
// This makes the handler work when API is served from project-root/fqs/api/index.php (production)
// or when PHP front-controller is backend/index.php (development).
$script = realpath($_SERVER['SCRIPT_FILENAME'] ?? '') ?: __FILE__;
$scriptDir = dirname($script);
// assume front controller lives in .../fqs/api/index.php or .../backend/index.php
$fqsRoot = dirname($scriptDir, 1); // if script is /.../fqs/api/index.php -> dirname gives /.../fqs
// create uploads under that root
$uploadsDir = $fqsRoot . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

if (empty($_FILES['file'])) {
    echo json_encode(['success' => 0, 'error' => 'No file uploaded']);
    exit;
}
// require upload role
require_role('upload');
$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => 0, 'error' => 'Upload error']);
    exit;
}
// basic sanitize & ensure allowed ext
$orig = basename($file['name']);
$ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
$allowed = ['png','jpg','jpeg','gif','webp'];
if (!in_array($ext, $allowed)) {
    echo json_encode(['success' => 0, 'error' => 'Unsupported file type']);
    exit;
}
$fname = time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
$target = $uploadsDir . DIRECTORY_SEPARATOR . $fname;
if (!move_uploaded_file($file['tmp_name'], $target)) {
    echo json_encode(['success' => 0, 'error' => 'Move failed']);
    exit;
}
// return web-accessible path (assuming backend served at project root)
// compute web-accessible path based on script URL path
// Compute web base from SCRIPT_NAME (e.g. '/MyFQs/api/index.php' -> '/MyFQs')
$scriptUrl = $_SERVER['SCRIPT_NAME'] ?? '/api/index.php';
$webBase = dirname(dirname($scriptUrl));
if ($webBase === '/' || $webBase === '.') $webBase = '';
$webPath = $webBase . '/uploads/' . $fname;
if ($webPath[0] !== '/') $webPath = '/' . ltrim($webPath, '/');
echo json_encode(['success' => 1, 'path' => $webPath, 'url' => $webPath]);
