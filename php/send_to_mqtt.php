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

// Konfigurasi ThingSpeak MQTT
$thingSpeakChannel = "2889619"; // Ganti dengan ID channel Anda
$thingSpeakWriteKey = "HAZMHVHWLFMGUMRV"; // Ganti dengan API key Anda

// Kirim data ke ThingSpeak menggunakan HTTP GET
$url = "https://api.thingspeak.com/update?api_key={$thingSpeakWriteKey}&field1=" . $data['derajatKemiringan'];

$response = file_get_contents($url);

if ($response) {
    echo json_encode(["status" => "success", "message" => "Data sent to MQTT successfully"]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to send data"]);
}
?>
