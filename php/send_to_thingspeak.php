<?php
// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

date_default_timezone_set("Asia/Jakarta");

// Ambil dan decode data JSON dari request POST
$json = file_get_contents("php://input");
$data = json_decode($json, true);

// Validasi input
if (!isset($data['derajatKemiringan'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Field 'derajatKemiringan' tidak ditemukan"
    ]);
    exit;
}

$derajat = $data['derajatKemiringan'];
if (!is_numeric($derajat)) {
    echo json_encode([
        "status" => "error",
        "message" => "Nilai 'derajatKemiringan' harus berupa angka"
    ]);
    exit;
}

// Buat file lock agar update otomatis (cron) berhenti sementara
$lockFile = __DIR__ . '/../cron/pause_fetch.lock';
file_put_contents($lockFile, "manual_send_by_php|" . date("Y-m-d H:i:s"));

// Cek rate limit 15 detik
$logFile = __DIR__ . '/../cron/last_sent.log';
$lastSent = file_exists($logFile) ? (int)file_get_contents($logFile) : 0;
$now = time();
$diff = $now - $lastSent;

if ($diff < 15) {
    // Hapus file lock karena pengiriman dibatalkan
    if (file_exists($lockFile)) unlink($lockFile);

    echo json_encode([
        "status" => "error",
        "message" => "Tunggu " . (15 - $diff) . " detik sebelum mengirim ulang ke ThingSpeak"
    ]);
    exit;
}

// Kirim ke ThingSpeak menggunakan API HTTP POST
$thingSpeakWriteKey = "5NSA14X55QWZPH0L"; // Ganti dengan Write API Key kamu
$url = "https://api.thingspeak.com/update";

$postData = http_build_query([
    'api_key' => $thingSpeakWriteKey,
    'field1'  => $derajat
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// Hapus file lock setelah proses selesai
if (file_exists($lockFile)) unlink($lockFile);

// Evaluasi hasil pengiriman
if ($http_code == 200 && is_numeric($response) && $response > 0) {
    // Simpan waktu pengiriman terakhir
    file_put_contents($logFile, time());

    echo json_encode([
        "status" => "success",
        "message" => "Data berhasil dikirim ke ThingSpeak",
        "entry_id" => (int)$response
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Gagal mengirim data ke ThingSpeak",
        "http_code" => $http_code,
        "curl_error" => $curl_error,
        "response" => $response
    ]);
}
?>
