<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Baca data dari request POST
$json = file_get_contents("php://input");
$data = json_decode($json, true);

// Validasi data
if (!isset($data['derajatKemiringan'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// Konfigurasi ThingSpeak API
$thingSpeakWriteKey = "MZIYNX5I6XWCACCA"; // Ganti dengan API key Anda

// Validasi nilai derajatKemiringan (pastikan berupa angka)
if (!is_numeric($data['derajatKemiringan'])) {
    echo json_encode(["status" => "error", "message" => "Invalid value for derajatKemiringan"]);
    exit;
}

// Kirim data ke ThingSpeak menggunakan cURL
$url = "https://api.thingspeak.com/update?api_key={$thingSpeakWriteKey}&field1=" . urlencode($data['derajatKemiringan']);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Eksekusi cURL
$response = curl_exec($ch);

// Periksa status HTTP
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($http_code != 200) {
    echo json_encode(["status" => "error", "message" => "ThingSpeak returned HTTP code: $http_code"]);
} else {
    if ($response == 0) {
        echo json_encode(["status" => "error", "message" => "Data not saved. Check the field format or API key."]);
    } else {
        echo json_encode(["status" => "success", "message" => "Data sent to ThingSpeak successfully"]);
    }
}

curl_close($ch);
?>
