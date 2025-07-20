<?php
// File BARU: backend/php/reset_alarm_status.php
// Tugas file ini hanya satu: mengirim nilai 0 ke field notifikasi di ThingSpeak.

header('Content-Type: application/json');

// --- KONFIGURASI (Sesuaikan dengan channel notifikasi Anda) ---
$writeApiKey = "5NSA14X55QWZPH0L"; // PENTING: Gunakan WRITE API Key
$notificationField = "field3"; // Field yang akan di-reset
// -----------------------------------------------------------

// Buat URL untuk ThingSpeak Update API
$url = "https://api.thingspeak.com/update?api_key=" . $writeApiKey . "&" . $notificationField . "=0";

// Gunakan file_get_contents untuk mengirim request GET (cara sederhana)
$response = @file_get_contents($url);

if ($response === FALSE) {
    // Gagal mengirim request
    echo json_encode(['status' => 'error', 'message' => 'Gagal mengirim request reset ke ThingSpeak.']);
} else if ($response == "0") {
    // ThingSpeak merespons "0" jika update gagal (misalnya, update terlalu cepat)
    echo json_encode(['status' => 'error', 'message' => 'ThingSpeak menolak update (mungkin karena rate limit).']);
} else {
    // Berhasil
    echo json_encode(['status' => 'success', 'message' => 'Status alarm berhasil di-reset ke 0.']);
}
?>