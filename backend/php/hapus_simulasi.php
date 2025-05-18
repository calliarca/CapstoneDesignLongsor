<?php
require 'config.php'; // koneksi ke database

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $simulationName = $_POST['simulation_name'] ?? '';  // Periksa nama simulasi

    if (!empty($simulationName)) {
        $stmt = $conn->prepare("DELETE FROM simulations WHERE simulation_name = ?");
        $stmt->bind_param("s", $simulationName);  // Gantilah tipe data menjadi 's' (string)

        if ($stmt->execute()) {
            echo "success";
        } else {
            echo "error";
        }

        $stmt->close();
    } else {
        echo "invalid";
    }
}
?>
