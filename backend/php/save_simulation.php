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

$json = file_get_contents("php://input");
$data = json_decode($json, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON data"]);
    exit;
}

// Sanitasi & konversi data (ambil semua field yang mungkin dikirim)
$simulationName = isset($data['simulationName']) ? trim($data['simulationName']) : 'Untitled Simulation';
$kelembabanTanah1 = isset($data['kelembabanTanah1']) ? floatval($data['kelembabanTanah1']) : 0;
$kelembabanTanah2 = isset($data['kelembabanTanah2']) ? floatval($data['kelembabanTanah2']) : 0;
$kelembabanTanah3 = isset($data['kelembabanTanah3']) ? floatval($data['kelembabanTanah3']) : 0;
$kelembabanTanah4 = isset($data['kelembabanTanah4']) ? floatval($data['kelembabanTanah4']) : 0;
$kelembabanTanah5 = isset($data['kelembabanTanah5']) ? floatval($data['kelembabanTanah5']) : 0;
$kelembabanTanah6 = isset($data['kelembabanTanah6']) ? floatval($data['kelembabanTanah6']) : 0;
$derajatKemiringan = isset($data['derajatKemiringan']) ? floatval($data['derajatKemiringan']) : 0;
$outputKemiringan = isset($data['outputKemiringan']) ? floatval($data['outputKemiringan']) : 0;
$curahHujan = isset($data['curahHujan']) ? floatval($data['curahHujan']) : 0;
$outputCurahHujan = isset($data['outputCurahHujan']) ? floatval($data['outputCurahHujan']) : 0;

// Handle client_timestamp
// JavaScript new Date().toISOString() menghasilkan format UTC 'YYYY-MM-DDTHH:mm:ss.sssZ'
// MySQL DATETIME menyimpannya apa adanya. Tampilan tergantung zona waktu saat query.
if (isset($data['client_timestamp'])) {
    try {
        $dateTime = new DateTime($data['client_timestamp']); // Parse ISO 8601 string
        $createdAt = $dateTime->format('Y-m-d H:i:s');    // Format untuk MySQL DATETIME
    } catch (Exception $e) {
        // Fallback jika format timestamp dari klien tidak valid
        $createdAt = date('Y-m-d H:i:s'); // Waktu server PHP saat ini (zona waktu PHP)
    }
} else {
    // Fallback jika client_timestamp tidak dikirim (seharusnya tidak terjadi dari JS yang sudah direvisi)
    $createdAt = date('Y-m-d H:i:s'); // Waktu server PHP saat ini
}

// Gunakan Prepared Statement
$sql = "INSERT INTO simulations (
            simulation_name, kelembaban_tanah_1, kelembaban_tanah_2, kelembaban_tanah_3, 
            kelembaban_tanah_4, kelembaban_tanah_5, kelembaban_tanah_6,
            derajat_kemiringan, output_kemiringan, curah_hujan, output_curah_hujan, 
            is_active, created_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)"; // is_active = 1, created_at dari variabel

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    echo json_encode(["status" => "error", "message" => "SQL prepare failed: " . $conn->error]);
    exit;
}

// Bind parameters (1 nama string, 10 float/double, 1 timestamp string)
$stmt->bind_param(
    "sdddddddddds", 
    $simulationName, 
    $kelembabanTanah1, $kelembabanTanah2, $kelembabanTanah3, 
    $kelembabanTanah4, $kelembabanTanah5, $kelembabanTanah6, 
    $derajatKemiringan, $outputKemiringan, 
    $curahHujan, $outputCurahHujan,
    $createdAt // Menggunakan $createdAt yang sudah diformat
);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Simulation data saved successfully with client timestamp."]);
} else {
    echo json_encode(["status" => "error", "message" => "Error executing query: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>