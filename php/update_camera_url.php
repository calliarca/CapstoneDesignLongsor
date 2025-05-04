<?php
session_start();

// Cek apakah user sudah login
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo "Unauthorized access.";
    exit;
}

// Pastikan metode adalah POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil input dari form
    $url = isset($_POST['camera_stream_url']) ? trim($_POST['camera_stream_url']) : '';

    // Validasi URL tidak kosong
    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'URL kamera tidak boleh kosong.']);
        exit;
    }

    // Validasi format URL
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Format URL tidak valid.']);
        exit;
    }

    // Path ke file konfigurasi URL kamera
    $cameraConfigFilePath = __DIR__ . '/../assets/js/camera_config.json';


    // Debug: pastikan path benar
    error_log("Path kamera config: " . $cameraConfigFilePath);

    // Pastikan direktori ada
    $cameraConfigDir = dirname($cameraConfigFilePath);
    if (!file_exists($cameraConfigDir)) {
        mkdir($cameraConfigDir, 0755, true);
    }

    // Cek apakah file bisa ditulis
    if (file_exists($cameraConfigFilePath) && !is_writable($cameraConfigFilePath)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'File konfigurasi tidak dapat ditulis. Cek permission.']);
        exit;
    }

    // Baca file konfigurasi lama jika ada
    $cameraConfigData = [];
    if (file_exists($cameraConfigFilePath)) {
        $jsonContent = file_get_contents($cameraConfigFilePath);
        $cameraConfigData = json_decode($jsonContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // Catat kesalahan JSON
            error_log("Error membaca JSON: " . json_last_error_msg());
            $cameraConfigData = [];
        }
    }

    // Update data URL kamera
    $cameraConfigData['camera_stream_url'] = $url;

    // Simpan kembali ke file
    $encodedData = json_encode($cameraConfigData, JSON_PRETTY_PRINT);
    if (file_put_contents($cameraConfigFilePath, $encodedData) !== false) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'message' => 'URL kamera berhasil diperbarui']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan konfigurasi.']);
    }
} else {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan. Gunakan POST.']);
}
?>
