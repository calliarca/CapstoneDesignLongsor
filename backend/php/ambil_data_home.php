<?php
header('Content-Type: application/json');

// --- Konfigurasi (GANTI DENGAN NILAI ANDA) ---
$thingSpeakConfig = [
    'kelembaban' => [
        'channel_id' => '2843704', // ID Channel Kelembaban Anda
        'read_api_key' => 'ZVBZD7YQNNEJR1U1',
        'fields' => ['field1', 'field2', 'field3', 'field4', 'field5', 'field6'] // Sesuaikan jika field berbeda
    ],
    'kemiringan_output' => [
        'channel_id' => '2889619', // ID Channel Kemiringan (output) Anda
        'read_api_key' => 'VHCFV8DETRRXRGCN',
        'field' => 'field2' // Sesuaikan jika field output kemiringan berbeda
    ],
    'curah_hujan_output' => [
        'channel_id' => '2972562', // ID Channel Output Curah Hujan Anda
        'read_api_key' => '46I76YZ62FSW76YF',
        'field' => 'field1' // Sesuaikan jika field output curah hujan berbeda
    ]
];

$responseData = [
    'status' => 'error',
    'message' => 'Gagal mengambil data awal.',
    'kelembaban' => [
        'sensor1' => 0, 'sensor2' => 0, 'sensor3' => 0,
        'sensor4' => 0, 'sensor5' => 0, 'sensor6' => 0
    ],
    'kemiringan' => 0, // Sesuai dengan 'outputKemiringan' di JS
    'curah_hujan_output_sensor' => 0, // Sesuai dengan 'outputCurahHujan' di JS
    'timestamp' => null
];

function fetchDataFromThingSpeak($url) {
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10, // Timeout 10 detik
    ]);
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($httpCode == 200 && $response) {
        return json_decode($response, true);
    }
    return null;
}

// 1. Ambil Data Kelembaban
$urlKelembaban = "https://api.thingspeak.com/channels/{$thingSpeakConfig['kelembaban']['channel_id']}/feeds.json?api_key={$thingSpeakConfig['kelembaban']['read_api_key']}&results=1";
$dataKelembabanRaw = fetchDataFromThingSpeak($urlKelembaban);

if ($dataKelembabanRaw && !empty($dataKelembabanRaw['feeds'])) {
    $latestFeedKelembaban = $dataKelembabanRaw['feeds'][0];
    $allFieldsPresent = true;
    foreach ($thingSpeakConfig['kelembaban']['fields'] as $index => $fieldKey) {
        if (isset($latestFeedKelembaban[$fieldKey])) {
            $responseData['kelembaban']['sensor' . ($index + 1)] = floatval($latestFeedKelembaban[$fieldKey]);
        } else {
            $allFieldsPresent = false; // Tandai jika ada field yang hilang
        }
    }
    if ($allFieldsPresent && isset($latestFeedKelembaban['created_at'])) {
         // Ambil timestamp dari data pertama yang berhasil diambil sebagai referensi
        if ($responseData['timestamp'] === null) {
            $responseData['timestamp'] = $latestFeedKelembaban['created_at'];
        }
        $responseData['status'] = 'success'; // Setidaknya data kelembaban ada
        $responseData['message'] = 'Data berhasil diambil.';
    }
}

// 2. Ambil Data Output Kemiringan
$fieldKemiringan = $thingSpeakConfig['kemiringan_output']['field'];
$urlKemiringan = "https://api.thingspeak.com/channels/{$thingSpeakConfig['kemiringan_output']['channel_id']}/fields/{$fieldKemiringan}.json?api_key={$thingSpeakConfig['kemiringan_output']['read_api_key']}&results=1";
$dataKemiringanRaw = fetchDataFromThingSpeak($urlKemiringan);

if ($dataKemiringanRaw && !empty($dataKemiringanRaw['feeds'])) {
    $latestFeedKemiringan = $dataKemiringanRaw['feeds'][0];
    if (isset($latestFeedKemiringan[$fieldKemiringan])) {
        $responseData['kemiringan'] = floatval($latestFeedKemiringan[$fieldKemiringan]);
        if (isset($latestFeedKemiringan['created_at']) && $responseData['timestamp'] === null) {
            $responseData['timestamp'] = $latestFeedKemiringan['created_at'];
        }
         if ($responseData['status'] !== 'success' && $responseData['status'] !== 'empty') $responseData['status'] = 'success';
         $responseData['message'] = 'Data berhasil diambil.';
    }
}


// 3. Ambil Data Output Curah Hujan
$fieldCurahHujan = $thingSpeakConfig['curah_hujan_output']['field'];
$urlCurahHujan = "https://api.thingspeak.com/channels/{$thingSpeakConfig['curah_hujan_output']['channel_id']}/fields/{$fieldCurahHujan}.json?api_key={$thingSpeakConfig['curah_hujan_output']['read_api_key']}&results=1";
$dataCurahHujanRaw = fetchDataFromThingSpeak($urlCurahHujan);

if ($dataCurahHujanRaw && !empty($dataCurahHujanRaw['feeds'])) {
    $latestFeedCurahHujan = $dataCurahHujanRaw['feeds'][0];
    if (isset($latestFeedCurahHujan[$fieldCurahHujan])) {
        $responseData['curah_hujan_output_sensor'] = floatval($latestFeedCurahHujan[$fieldCurahHujan]);
        if (isset($latestFeedCurahHujan['created_at']) && $responseData['timestamp'] === null) {
            $responseData['timestamp'] = $latestFeedCurahHujan['created_at'];
        }
        if ($responseData['status'] !== 'success' && $responseData['status'] !== 'empty') $responseData['status'] = 'success';
        $responseData['message'] = 'Data berhasil diambil.';
    }
}

// Jika setelah semua upaya status masih error, tapi ada beberapa data
if ($responseData['status'] === 'error' && ($responseData['kemiringan'] != 0 || $responseData['curah_hujan_output_sensor'] != 0 /*|| cek kelembaban != 0*/)) {
    // Mungkin beberapa data berhasil diambil, yang lain tidak
    // Untuk sementara kita anggap 'empty' jika tidak semua ada, atau biarkan 'error' jika ingin lebih ketat
    // Jika ingin lebih longgar: $responseData['status'] = 'partial_success'; atau 'empty';
}


// Jika tidak ada timestamp yang didapat dari ThingSpeak, gunakan waktu server
if ($responseData['timestamp'] === null && $responseData['status'] === 'success') {
    $responseData['timestamp'] = date('c'); // ISO 8601 format
}

// Cek apakah data benar-benar kosong setelah semua fetch
$isDataEffectivelyEmpty = true;
foreach($responseData['kelembaban'] as $val) { if ($val != 0) $isDataEffectivelyEmpty = false; break;}
if ($responseData['kemiringan'] != 0) $isDataEffectivelyEmpty = false;
if ($responseData['curah_hujan_output_sensor'] != 0) $isDataEffectivelyEmpty = false;

if ($responseData['status'] === 'success' && $isDataEffectivelyEmpty) {
    $responseData['status'] = 'empty';
    $responseData['message'] = 'Data dari ThingSpeak kosong atau semua sensor bernilai 0.';
}


echo json_encode($responseData);

?>