<?php
// Set response headers (ini harus di paling atas tanpa ada output lain sebelumnya)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Sesuaikan untuk produksi
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

// Validasi input untuk curahHujanKontrol
if (!isset($data['curahHujanKontrol'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Field 'curahHujanKontrol' tidak ditemukan"
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

$curahHujan = $data['curahHujanKontrol'];
if (!is_numeric($curahHujan)) {
    echo json_encode([
        "status" => "error",
        "message" => "Nilai 'curahHujanKontrol' harus berupa angka"
    ]);
    exit;
}

// TENTUKAN PATH YANG BENAR UNTUK DIREKTORI CRON ANDA (untuk pause_fetch.lock)
// OPSI 1: Jika 'cron' sejajar dengan 'backend'
// $cronDir = __DIR__ . '/../../cron';
// OPSI 2: Jika 'cron' di dalam 'backend' (sejajar dengan 'php')
$cronDir = __DIR__ . '/../cron';

// Buat direktori jika belum ada (opsional, tapi membantu untuk setup awal)
if (!is_dir($cronDir)) {
    // Coba buat direktori secara rekursif
    if (!mkdir($cronDir, 0775, true)) {
        // Jika gagal, kirim respons error
        echo json_encode([
            "status" => "error",
            "message" => "Gagal membuat direktori cron: " . $cronDir . ". Periksa izin."
        ]);
        exit;
    }
}

$lockFile = $cronDir . '/pause_fetch.lock';

// Buat file lock agar update otomatis (cron) berhenti sementara
// Menggunakan @ untuk menekan pesan error jika file_put_contents gagal karena masalah izin,
// karena kita akan menangani error tersebut secara eksplisit.
if (@file_put_contents($lockFile, "manual_send_by_php|" . date("Y-m-d H:i:s")) === false) {
    echo json_encode([
        "status" => "error",
        "message" => "Gagal menulis lock file: " . $lockFile . ". Periksa izin."
    ]);
    exit;
}

// Kirim ke ThingSpeak menggunakan API HTTP POST
$thingSpeakWriteKey = "5NSA14X55QWZPH0L"; // Ganti dengan Write API Key kamu
$url = "https://api.thingspeak.com/update";

// Data yang akan dikirim ke ThingSpeak
$postDataArray = [
    'api_key' => $thingSpeakWriteKey,
    'field1'  => $derajat,
    'field2'  => $curahHujan // Menambahkan data curah hujan ke field2
];

$postData = http_build_query($postDataArray);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// Tambahkan timeout untuk cURL jika diperlukan
// curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
// curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// Hapus file lock setelah proses selesai
if (file_exists($lockFile)) {
    // Menggunakan @ untuk menekan pesan error jika unlink gagal,
    // meskipun idealnya ini tidak boleh gagal jika file_put_contents berhasil.
    @unlink($lockFile);
}

// Evaluasi hasil pengiriman
if ($http_code == 200 && is_numeric($response) && $response > 0) {
    echo json_encode([
        "status" => "success",
        "message" => "Data berhasil dikirim ke ThingSpeak",
        "entry_id" => (int)$response,
        "sent_data" => $postDataArray // Menambahkan data yang dikirim untuk verifikasi
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Gagal mengirim data ke ThingSpeak",
        "http_code" => $http_code,
        "curl_error" => $curl_error, // Sertakan error cURL untuk debugging
        "response" => $response,
        "sent_data" => $postDataArray // Menambahkan data yang coba dikirim
    ]);
}
?>
