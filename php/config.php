<?php
// Pastikan session belum dimulai sebelum mengatur session settings
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Konfigurasi database
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "simulator_longsor";

// Buat koneksi database
$conn = new mysqli($servername, $username, $password, $dbname);

// Periksa koneksi
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

// Atur karakter encoding agar mendukung UTF-8
$conn->set_charset("utf8mb4");
?>
