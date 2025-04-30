<?php
header('Content-Type: application/json');
session_start();

// Debugging: Cek apakah data dikirim
error_log("POST Data: " . json_encode($_POST));

if (!isset($_POST['email']) || !isset($_POST['password']) || empty($_POST['email']) || empty($_POST['password'])) {
    echo json_encode(["status" => "error", "message" => "Email dan password harus diisi"]);
    exit;
}

// Database Config
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "simulator_longsor";
$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit;
}

$email = trim($_POST['email']);
$password = trim($_POST['password']);

$query = $conn->prepare("SELECT id, name, email, account_type, password FROM users WHERE email = ?");
$query->bind_param("s", $email);
$query->execute();
$result = $query->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();

    if (password_verify($password, $user['password'])) { // Pastikan password tersimpan dalam bentuk hash
        // Simpan data session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['account_type'] = $user['account_type'];

        // Debugging: Cek apakah session benar-benar tersimpan
        error_log("Session Data: " . json_encode($_SESSION));

        echo json_encode([
            "status" => "success",
            "message" => "Login berhasil!",
            "account_type" => $_SESSION['account_type']
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Password salah"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Email tidak ditemukan"]);
}

$conn->close();
?>
