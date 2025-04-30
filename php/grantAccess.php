<?php
session_start();
header('Content-Type: application/json');
include_once 'config.php'; // Koneksi database

// Periksa apakah user sudah login
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized access"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['email']) && isset($data['simulation_id'])) {
    $email = $data['email'];
    $simulation_id = $data['simulation_id'];
    $admin_id = $_SESSION['user_id']; // ID admin yang memberi akses

    // Cari user_id berdasarkan email
    $queryUser = "SELECT id FROM users WHERE email = ?";
    $stmt = $conn->prepare($queryUser);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        echo json_encode(["status" => "error", "message" => "User not found"]);
        exit();
    }

    $user = $result->fetch_assoc();
    $user_id = $user['id'];

    // Cek apakah user sudah punya akses
    $checkQuery = "SELECT * FROM user_simulation_access WHERE user_id = ? AND simulation_id = ?";
    $stmt = $conn->prepare($checkQuery);
    $stmt->bind_param("ii", $user_id, $simulation_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "User already has access"]);
        exit();
    }

    // Berikan akses ke user
    $query = "INSERT INTO user_simulation_access (user_id, simulation_id, granted_by) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iii", $user_id, $simulation_id, $admin_id);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Access granted"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to grant access"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid data"]);
}
?>
