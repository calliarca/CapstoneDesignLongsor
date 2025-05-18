<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Metode request tidak diizinkan. Gunakan POST.'
    ]);
    exit;
}

$humidity = trim($_POST['humidity_channel'] ?? '');
$slope = trim($_POST['slope_channel'] ?? '');

if (!ctype_digit($humidity) || strlen($humidity) !== 6) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Channel ID Kelembapan harus berupa 6 digit angka'
    ]);
    exit;
}

if (!ctype_digit($slope) || strlen($slope) !== 6) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Channel ID Kemiringan harus berupa 6 digit angka'
    ]);
    exit;
}

$configFile = __DIR__ . '../../assets/js/channel_config.json';

if (!is_writable(dirname($configFile))) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal menyimpan: Direktori tidak bisa ditulisi'
    ]);
    exit;
}

$data = [
    'humidity_channel_id' => $humidity,
    'slope_channel_id' => $slope
];

$result = file_put_contents($configFile, json_encode($data, JSON_PRETTY_PRINT));

if ($result === false) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal menyimpan konfigurasi'
    ]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'message' => 'Channel ID berhasil diperbarui'
]);
?>
