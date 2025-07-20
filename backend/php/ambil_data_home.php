<?php
header('Content-Type: application/json');

// 1. Muat konfigurasi terpusat
require_once 'config_loader.php';

// Inisialisasi array respons
$responseData = [
    'status' => 'error',
    'message' => 'Gagal mengambil data awal.',
    'kelembaban' => null,
    'kemiringan' => null,
    'yaw' => null,
    'roll' => null,
    'curahHujan' => null,
    'timestamp' => null
];

function fetchDataFromThingSpeak($url) {
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    return ($httpCode == 200 && $response) ? json_decode($response, true) : null;
}

// 2. Ambil Data Kelembaban
$kelembabanConfig = $thingspeakConfig['kelembaban'];
$urlKelembaban = "https://api.thingspeak.com/channels/{$kelembabanConfig['channel_id']}/feeds.json?api_key={$kelembabanConfig['read_api_key']}&results=1";
$dataKelembaban = fetchDataFromThingSpeak($urlKelembaban);

if ($dataKelembaban && !empty($dataKelembaban['feeds'])) {
    $feed = $dataKelembaban['feeds'][0];
    $responseData['kelembaban'] = [
        'sensor1' => floatval($feed['field1'] ?? 0), 'sensor2' => floatval($feed['field2'] ?? 0),
        'sensor3' => floatval($feed['field3'] ?? 0), 'sensor4' => floatval($feed['field4'] ?? 0),
        'sensor5' => floatval($feed['field5'] ?? 0), 'sensor6' => floatval($feed['field6'] ?? 0)
    ];
    $responseData['timestamp'] = $feed['created_at'];
}

// 3. Ambil Data Kemiringan (Pitch, Yaw, Roll)
$kemiringanConfig = $thingspeakConfig['kemiringan'];
$urlKemiringan = "https://api.thingspeak.com/channels/{$kemiringanConfig['channel_id']}/feeds.json?api_key={$kemiringanConfig['read_api_key']}&results=1";
$dataKemiringan = fetchDataFromThingSpeak($urlKemiringan);

if ($dataKemiringan && !empty($dataKemiringan['feeds'])) {
    $feed = $dataKemiringan['feeds'][0];
    $responseData['kemiringan'] = floatval($feed['field' . $kemiringanConfig['fields']['pitch']] ?? 0);
    $responseData['yaw'] = floatval($feed['field' . $kemiringanConfig['fields']['yaw']] ?? 0);
    $responseData['roll'] = floatval($feed['field' . $kemiringanConfig['fields']['roll']] ?? 0);
    if (!$responseData['timestamp'] || strtotime($feed['created_at']) > strtotime($responseData['timestamp'])) {
        $responseData['timestamp'] = $feed['created_at'];
    }
}

// 4. Ambil Data Curah Hujan
$hujanConfig = $thingspeakConfig['curah_hujan'];
$urlCurahHujan = "https://api.thingspeak.com/channels/{$hujanConfig['channel_id']}/fields/{$hujanConfig['fields']['input']}.json?api_key={$hujanConfig['read_api_key']}&results=1";
$dataCurahHujan = fetchDataFromThingSpeak($urlCurahHujan);

if ($dataCurahHujan && !empty($dataCurahHujan['feeds'])) {
    $feed = $dataCurahHujan['feeds'][0];
    $responseData['curahHujan'] = floatval($feed['field' . $hujanConfig['fields']['input']] ?? 0);
    if (!$responseData['timestamp'] || strtotime($feed['created_at']) > strtotime($responseData['timestamp'])) {
        $responseData['timestamp'] = $feed['created_at'];
    }
}

// Final status check
if ($responseData['kelembaban'] || $responseData['kemiringan'] || $responseData['curahHujan']) {
    $responseData['status'] = 'success';
    $responseData['message'] = 'Data berhasil diambil.';
}

echo json_encode($responseData);
?>
