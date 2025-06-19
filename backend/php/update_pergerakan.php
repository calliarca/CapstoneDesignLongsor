<?php
header('Content-Type: application/json');
// Pastikan koneksi ini sesuai dengan konfigurasi Anda
$conn = new mysqli("srv1321.hstgr.io", "u160973994_twins", "w8/I:N|e4@g", "u160973994_twins");

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Koneksi gagal: ' . $conn->connect_error]);
    exit;
}

// Update SEMUA simulasi yang sedang aktif menjadi "pergerakan terdeteksi"
$sql = "UPDATE simulations SET pergerakan_terdeteksi = 1 WHERE is_active = 1";

if ($conn->query($sql) === TRUE && $conn->affected_rows > 0) {
    echo json_encode(['status' => 'success', 'message' => 'Status pergerakan diperbarui.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Gagal update atau tidak ada simulasi aktif.']);
}

$conn->close();
?>