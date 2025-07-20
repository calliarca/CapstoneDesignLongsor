<?php
header('Content-Type: application/json');

// 1. Muat konfigurasi terpusat
require_once 'config_loader.php';

// 2. Ambil konfigurasi dari variabel $thingspeakConfig
$kontrolConfig = $thingspeakConfig['kontrol_simulator'];
$writeApiKey = $kontrolConfig['write_api_key'];
$notificationField = "field" . $kontrolConfig['fields']['alert_longsor'];

// Buat URL untuk ThingSpeak Update API
$url = "https://api.thingspeak.com/update?api_key=" . $writeApiKey . "&" . $notificationField . "=0";

$response = @file_get_contents($url);

if ($response === FALSE) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Gagal mengirim request reset ke ThingSpeak.']);
} else if ($response == "0") {
    http_response_code(429); // 429 Too Many Requests adalah kode yang lebih tepat
    echo json_encode(['status' => 'error', 'message' => 'ThingSpeak menolak update (rate limit).']);
} else {
    echo json_encode(['status' => 'success', 'message' => 'Status alarm berhasil di-reset ke 0.']);
}
?>
