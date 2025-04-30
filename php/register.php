<?php
include 'config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = trim($_POST["name"]);
    $email = trim($_POST["email"]);
    $password = $_POST["password"];
    $accountType = $_POST["accountType"];

    if (empty($name) || empty($email) || empty($password) || empty($accountType)) {
        echo "Harap isi semua bidang!";
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Format email tidak valid!";
        exit;
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    $sql = "INSERT INTO users (name, email, password, account_type) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $name, $email, $hashed_password, $accountType);

    if ($stmt->execute()) {
        echo "Pendaftaran berhasil!";
    } else {
        echo "Gagal mendaftar: " . $conn->error;
    }

    $stmt->close();
    $conn->close();
}
?>
