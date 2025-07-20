<?php
header('Content-Type: application/json');
date_default_timezone_set("Asia/Jakarta");

// 1. Muat konfigurasi terpusat
require_once 'config_loader.php';

// Ambil data JSON dari request POST
$json = file_get_contents("php://input");
$data = json_decode($json, true);

// Validasi input
if (!isset($data['derajatKemiringan']) || !isset($data['curahHujanKontrol'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Input 'derajatKemiringan' dan 'curahHujanKontrol' dibutuhkan."]);
    exit;
}

$derajat = $data['derajatKemiringan'];
$curahHujan = $data['curahHujanKontrol'];

if (!is_numeric($derajat) || !is_numeric($curahHujan)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Nilai input harus berupa angka."]);
    exit;
}

// 2. Ambil konfigurasi dari variabel $thingspeakConfig
$kontrolConfig = $thingspeakConfig['kontrol_simulator'];
$writeApiKey = $kontrolConfig['write_api_key'];
$fieldKemiringan = "field" . $kontrolConfig['fields']['derajat_kemiringan'];
$fieldCurahHujan = "field" . $kontrolConfig['fields']['curah_hujan_kontrol'];

// Kirim ke ThingSpeak menggunakan API HTTP POST
$url = "https://api.thingspeak.com/update";
$postDataArray = [
    'api_key' => $writeApiKey,
    $fieldKemiringan  => $derajat,
    $fieldCurahHujan  => $curahHujan
];

$postData = http_build_query($postDataArray);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// Evaluasi hasil pengiriman
if ($http_code == 200 && is_numeric($response) && $response > 0) {
    echo json_encode([
        "status" => "success",
        "message" => "Data berhasil dikirim ke ThingSpeak",
        "entry_id" => (int)$response,
        "sent_data" => $postDataArray
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal mengirim data ke ThingSpeak",
        "http_code" => $http_code,
        "curl_error" => $curl_error,
        "response" => $response
    ]);
}
?>
