<?php
$koneksi = new mysqli("localhost", "root", "", "simulator_longsor");
if ($koneksi->connect_error) {
    die("Koneksi gagal: " . $koneksi->connect_error);
}

// Set is_active = 0 untuk semua simulasi yang aktif
$query = "UPDATE simulations SET is_active = 0 WHERE is_active = 1";
if ($koneksi->query($query)) {
    echo json_encode(["status" => "success", "message" => "Simulasi dihentikan"]);
} else {
    echo json_encode(["status" => "error", "message" => "Gagal update status"]);
}
$koneksi->close();
?>
