<?php
session_start();
header("Content-Type: application/json");

// Cek apakah sesi sudah ada
if (isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "success",
        "session_data" => [
            "user_id" => $_SESSION['user_id'],
            "name" => $_SESSION['name'] ?? "Unknown",
            "email" => $_SESSION['email'] ?? "Unknown",
            "account_type" => $_SESSION['account_type'] ?? "Unknown"
        ]
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Session tidak ditemukan"
    ]);
}

// Pastikan tidak ada output tambahan
exit();
