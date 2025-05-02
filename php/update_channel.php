<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validasi input
    $humidity = trim($_POST['humidity_channel'] ?? '');
    $slope = trim($_POST['slope_channel'] ?? '');

    // Validasi bahwa input adalah angka
    if (!ctype_digit($humidity)) {
        echo 'Channel ID Kelembaban harus berupa angka';
        exit;
    }

    if (!ctype_digit($slope)) {
        echo 'Channel ID Kemiringan harus berupa angka';
        exit;
    }

    // Pastikan direktori bisa ditulisi
    $configFile = 'channel_config.json';
    if (!is_writable(dirname($configFile))) {
        echo 'Gagal menyimpan: Direktori tidak bisa ditulisi';
        exit;
    }

    // Simpan data
    $data = [
        'humidity_channel_id' => $humidity,
        'slope_channel_id' => $slope
    ];

    $result = file_put_contents($configFile, json_encode($data, JSON_PRETTY_PRINT));

    if ($result === false) {
        echo 'Gagal menyimpan konfigurasi';
        exit;
    }

    // Kirimkan pesan sukses ke JavaScript
    echo 'Channel ID berhasil diperbarui';
} else {
    echo 'Metode request tidak valid';
}
?>
