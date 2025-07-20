<?php
// Mencegah akses langsung ke file ini
if (basename(__FILE__) == basename($_SERVER["SCRIPT_FILENAME"])) {
    die('Akses langsung tidak diizinkan.');
}

// Path ke file konfigurasi JSON. __DIR__ memastikan path selalu benar.
$configPath = __DIR__ . '../../assets/js/thingspeak_config.json';

if (!file_exists($configPath)) {
    // Hentikan eksekusi dan berikan pesan error yang jelas jika file tidak ada
    header('Content-Type: application/json');
    http_response_code(500);
    die(json_encode([
        'status' => 'error', 
        'message' => 'File konfigurasi thingspeak_config.json tidak ditemukan!'
    ]));
}

$jsonString = file_get_contents($configPath);
$thingspeakConfig = json_decode($jsonString, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    // Hentikan eksekusi jika format JSON tidak valid
    header('Content-Type: application/json');
    http_response_code(500);
    die(json_encode([
        'status' => 'error', 
        'message' => 'Gagal mem-parsing thingspeak_config.json: ' . json_last_error_msg()
    ]));
}
?>