<?php
header('Content-Type: application/json');
// Pastikan koneksi ini sesuai dengan konfigurasi Anda
$conn = new mysqli("srv1321.hstgr.io", "u160973994_twins", "w8/I:N|e4@g", "u160973994_twins");

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Koneksi gagal: ' . $conn->connect_error]);
    exit;
}

$simulationName = isset($_GET['simulationName']) ? $_GET['simulationName'] : '';
$response = ['pergerakan_terdeteksi' => 0];

if (!empty($simulationName)) {
    // Ambil data terbaru dari simulasi yang aktif
    $stmt = $conn->prepare("SELECT pergerakan_terdeteksi FROM simulations WHERE simulation_name = ? AND is_active = 1 ORDER BY id DESC LIMIT 1");
    $stmt->bind_param("s", $simulationName);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $response['pergerakan_terdeteksi'] = (int)$row['pergerakan_terdeteksi'];
    }
    $stmt->close();
}

$conn->close();
echo json_encode($response);
?>