<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Koneksi ke database MySQL
$servername = "localhost";
$username = "root"; // Ganti dengan username MySQL Anda
$password = ""; // Ganti dengan password MySQL Anda
$dbname = "simulator_longsor";

// Buat koneksi ke database
$conn = new mysqli($servername, $username, $password, $dbname);

// Cek koneksi
if ($conn->connect_error) {
    die(json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]));
}

// Ambil data dari request POST
$json = file_get_contents("php://input");
$data = json_decode($json, true);

// Validasi data JSON
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON data"]);
    exit;
}

// Pastikan semua field ada, gunakan nilai default jika tidak ada
$requiredFields = [
    'simulationName' => '', 
    'kelembabanTanah1' => 0, 
    'kelembabanTanah2' => 0, 
    'kelembabanTanah3' => 0, 
    'kelembabanTanah4' => 0, 
    'kelembabanTanah5' => 0, 
    'kelembabanTanah6' => 0, 
    'derajatKemiringan' => 0, 
    'outputKemiringan' => 0, 
    'curahHujan' => 0, 
    'outputCurahHujan' => 0
];

foreach ($requiredFields as $field => $defaultValue) {
    if (!isset($data[$field])) {
        $data[$field] = $defaultValue; // Gunakan nilai default jika field tidak ada
    }
}

// Sanitasi & konversi data
$simulationName = trim($data['simulationName']);
$kelembabanTanah1 = floatval($data['kelembabanTanah1']);
$kelembabanTanah2 = floatval($data['kelembabanTanah2']);
$kelembabanTanah3 = floatval($data['kelembabanTanah3']);
$kelembabanTanah4 = floatval($data['kelembabanTanah4']);
$kelembabanTanah5 = floatval($data['kelembabanTanah5']);
$kelembabanTanah6 = floatval($data['kelembabanTanah6']);
$derajatKemiringan = floatval($data['derajatKemiringan']);
$outputKemiringan = floatval($data['outputKemiringan']);
$curahHujan = floatval($data['curahHujan']);
$outputCurahHujan = floatval($data['outputCurahHujan']);

// Gunakan Prepared Statement untuk keamanan
$sql = "INSERT INTO simulations (
            simulation_name, kelembaban_tanah_1, kelembaban_tanah_2, kelembaban_tanah_3, kelembaban_tanah_4, kelembaban_tanah_5, kelembaban_tanah_6,
            derajat_kemiringan, output_kemiringan, curah_hujan, output_curah_hujan, is_active, created_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())";

// Prepare the statement
$stmt = $conn->prepare($sql);
if ($stmt === false) {
    echo json_encode(["status" => "error", "message" => "SQL prepare failed: " . $conn->error]);
    exit;
}

// Bind parameters, excluding the "is_active" field which is hardcoded to 1
$stmt->bind_param(
    "sdddddddddd", 
    $simulationName, 
    $kelembabanTanah1, 
    $kelembabanTanah2, 
    $kelembabanTanah3, 
    $kelembabanTanah4, 
    $kelembabanTanah5, 
    $kelembabanTanah6, 
    $derajatKemiringan, 
    $outputKemiringan, 
    $curahHujan, 
    $outputCurahHujan
);

// Execute the statement
if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Simulation saved successfully"]);
} else {
    echo json_encode(["status" => "error", "message" => "Error executing query: " . $stmt->error]);
}

// Close the statement and connection
$stmt->close();
$conn->close();
?>
