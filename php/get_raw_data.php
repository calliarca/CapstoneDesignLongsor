<?php
require_once 'config.php';

header('Content-Type: application/json');

// Validasi parameter
if (!isset($_GET['simulation_name']) || empty($_GET['simulation_name'])) {
    echo json_encode(["status" => "error", "message" => "Simulation name missing"]);
    exit;
}

$simulationName = $_GET['simulation_name'];

// Query lengkap ke database
$stmt = $conn->prepare("
    SELECT 
        id,
        simulation_name,
        kelembaban_tanah_1,
        kelembaban_tanah_2,
        kelembaban_tanah_3,
        kelembaban_tanah_4,
        kelembaban_tanah_5,
        kelembaban_tanah_6,
        derajat_kemiringan,
        output_kemiringan,
        curah_hujan,
        output_curah_hujan,
        created_at
    FROM simulations
    WHERE simulation_name = ?
");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Failed to prepare statement"]);
    exit;
}

$stmt->bind_param("s", $simulationName);
$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = [
        'created_at' => $row['created_at'],
        'kelembaban_tanah_1' => $row['kelembaban_tanah_1'],
        'kelembaban_tanah_2' => $row['kelembaban_tanah_2'],
        'kelembaban_tanah_3' => $row['kelembaban_tanah_3'],
        'kelembaban_tanah_4' => $row['kelembaban_tanah_4'],
        'kelembaban_tanah_5' => $row['kelembaban_tanah_5'],
        'kelembaban_tanah_6' => $row['kelembaban_tanah_6'],
        'derajat_kemiringan' => $row['derajat_kemiringan'],
        'output_kemiringan' => $row['output_kemiringan'],
        'curah_hujan' => $row['curah_hujan'],
        'output_curah_hujan' => $row['output_curah_hujan']
    ];
}

echo json_encode(["status" => "success", "rows" => $data]);
?>
