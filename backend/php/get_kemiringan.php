<?php
$koneksi = new mysqli("localhost", "root", "", "simulator_longsor");

if ($koneksi->connect_error) {
    die("Koneksi gagal: " . $koneksi->connect_error);
}

// Ambil data output_kemiringan terbaru dari tabel simulation
$sql = "SELECT output_kemiringan FROM simulations ORDER BY created_at DESC LIMIT 1";
$result = $koneksi->query($sql);

if ($result && $row = $result->fetch_assoc()) {
    echo $row['output_kemiringan'];
} else {
    echo "--";
}

$koneksi->close();
?>
