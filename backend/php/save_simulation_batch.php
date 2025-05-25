<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Sesuaikan untuk produksi
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Konfigurasi database
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "simulator_longsor";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]);
    exit;
}

$jsonPayload = file_get_contents("php://input");
$payload = json_decode($jsonPayload, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload) || 
    !isset($payload['simulationName']) || !isset($payload['dataPoints']) || !is_array($payload['dataPoints'])) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON data or missing fields."]);
    exit;
}

$simulationName = trim($payload['simulationName']);
// Ambil input pengguna yang berlaku untuk batch ini
$derajatKemiringanInput = isset($payload['derajatKemiringanInput']) ? floatval($payload['derajatKemiringanInput']) : 0;
$curahHujanInput = isset($payload['curahHujanInput']) ? floatval($payload['curahHujanInput']) : 0;
$dataPoints = $payload['dataPoints'];

if (empty($simulationName) || empty($dataPoints)) {
    echo json_encode(["status" => "error", "message" => "Simulation name or data points cannot be empty."]);
    exit;
}

// Gunakan Prepared Statement untuk keamanan
// Perhatikan kolom created_at, kita akan menggunakan dari klien
$sql = "INSERT INTO simulations (
            simulation_name, 
            kelembaban_tanah_1, kelembaban_tanah_2, kelembaban_tanah_3, 
            kelembaban_tanah_4, kelembaban_tanah_5, kelembaban_tanah_6,
            derajat_kemiringan, output_kemiringan, 
            curah_hujan, output_curah_hujan, 
            is_active, created_at 
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)"; // is_active = 1 untuk data log selama simulasi aktif

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    echo json_encode(["status" => "error", "message" => "SQL prepare failed: " . $conn->error]);
    exit;
}

$conn->begin_transaction();
$successCount = 0;
$errors = [];

foreach ($dataPoints as $dp) {

    $kt1 = isset($dp['kelembabanTanah1']) ? floatval($dp['kelembabanTanah1']) : 0;
    $kt2 = isset($dp['kelembabanTanah2']) ? floatval($dp['kelembabanTanah2']) : 0;
    $kt3 = isset($dp['kelembabanTanah3']) ? floatval($dp['kelembabanTanah3']) : 0;
    $kt4 = isset($dp['kelembabanTanah4']) ? floatval($dp['kelembabanTanah4']) : 0;
    $kt5 = isset($dp['kelembabanTanah5']) ? floatval($dp['kelembabanTanah5']) : 0;
    $kt6 = isset($dp['kelembabanTanah6']) ? floatval($dp['kelembabanTanah6']) : 0;
    $outputKemiringan = isset($dp['outputKemiringan']) ? floatval($dp['outputKemiringan']) : 0;
    $outputCurahHujan = isset($dp['outputCurahHujan']) ? floatval($dp['outputCurahHujan']) : 0;

    // Validasi dan format client_timestamp
        $clientTimestamp = isset($dp['client_timestamp']) ? $dp['client_timestamp'] : date('Y-m-d H:i:s');
        try {
            $dateTime = new DateTime($clientTimestamp);
            $formattedTimestamp = $dateTime->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $formattedTimestamp = date('Y-m-d H:i:s'); // Fallback jika format tidak valid
        }

    $stmt->bind_param(
        "sdddddddddds", 
        $simulationName, 
        $kt1, $kt2, $kt3, $kt4, $kt5, $kt6,
        $derajatKemiringanInput, // Input pengguna yang berlaku untuk batch ini
        $outputKemiringan,      // Sensor aktual
        $curahHujanInput,       // Input pengguna yang berlaku untuk batch ini
        $outputCurahHujan,      // Sensor aktual
        $formattedTimestamp     // Timestamp dari klien
    );

    if ($stmt->execute()) {
        $successCount++;
    } else {
        $errors[] = $stmt->error;
    }
}

if (empty($errors)) {
    $conn->commit();
    echo json_encode(["status" => "success", "message" => "$successCount data points saved successfully for simulation '$simulationName'."]);
} else {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Some data points failed to save. Errors: " . implode(", ", $errors)]);
}

$stmt->close();
$conn->close();
?>