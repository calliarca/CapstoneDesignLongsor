<?php
date_default_timezone_set("Asia/Jakarta");

// Koneksi database
$host = "localhost";
$user = "root";
$pass = "";
$db = "simulator_longsor";

$koneksi = new mysqli($host, $user, $pass, $db);
if ($koneksi->connect_error) {
    die("❌ Koneksi gagal: " . $koneksi->connect_error);
}

// Cek file pause_fetch.lock
$lockFile = __DIR__ . '/../cron/pause_fetch.lock';
if (file_exists($lockFile)) {
    echo "⏸️ Proses ditunda karena pengiriman manual sedang berlangsung.\n";
    exit;
}

// Load konfigurasi channel
$configFile = __DIR__ . '/../assets/js/channel_config.json';
if (!file_exists($configFile)) {
    $defaultConfig = [
        'humidity_channel_id' => '2843704',
        'slope_channel_id' => '2843705'
    ];
    file_put_contents($configFile, json_encode($defaultConfig, JSON_PRETTY_PRINT));
    echo "⚠️ File konfigurasi tidak ditemukan. File default telah dibuat.\n";
}
$config = json_decode(file_get_contents($configFile), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("❌ Gagal membaca file konfigurasi: " . json_last_error_msg());
}

$humidityChannelId = $config['humidity_channel_id'] ?? '2843704';

// Ambil simulation aktif
$getSimName = $koneksi->query("SELECT simulation_name FROM simulations WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
$simNameRow = $getSimName->fetch_assoc();
$simulationName = $simNameRow['simulation_name'] ?? null;

if (!$simulationName) {
    echo "⚠️ Tidak ada simulasi aktif. Data tidak disimpan.\n";
    exit;
}

// Ambil data dari ThingSpeak
$url = "https://api.thingspeak.com/channels/$humidityChannelId/feeds.json?results=1";
$response = @file_get_contents($url);
if ($response === false) {
    echo "❌ Gagal mengambil data dari ThingSpeak.\n";
    exit;
}

$data = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ JSON dari ThingSpeak tidak valid: " . json_last_error_msg() . "\n";
    exit;
}

$feed = $data['feeds'][0] ?? null;
if (!$feed) {
    echo "⚠️ Tidak ada feed data dari ThingSpeak.\n";
    exit;
}

$created_at = date("Y-m-d H:i:s", strtotime($feed['created_at']));
$kelembaban = [];
for ($i = 1; $i <= 6; $i++) {
    $kelembaban[] = isset($feed["field$i"]) ? floatval($feed["field$i"]) : null;
}

// Cek apakah data kelembaban dengan timestamp ini sudah disimpan
$cek = $koneksi->prepare("SELECT id FROM simulations WHERE created_at = ?");
$cek->bind_param("s", $created_at);
$cek->execute();
$cek->store_result();

if ($cek->num_rows > 0) {
    echo "⚠️ Data kelembaban sudah ada di database.\n";
    $cek->close();
    $koneksi->close();
    exit;
}
$cek->close();

// Simpan ke database
$query = "INSERT INTO simulations (
    simulation_name, kelembaban_tanah_1, kelembaban_tanah_2, kelembaban_tanah_3,
    kelembaban_tanah_4, kelembaban_tanah_5, kelembaban_tanah_6, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $koneksi->prepare($query);
$stmt->bind_param(
    "sdddddds",
    $simulationName,
    $kelembaban[0], $kelembaban[1], $kelembaban[2],
    $kelembaban[3], $kelembaban[4], $kelembaban[5],
    $created_at
);

if ($stmt->execute()) {
    echo "✅ Data kelembaban berhasil disimpan pada $created_at (Channel ID: $humidityChannelId)\n";
} else {
    echo "❌ Gagal menyimpan data: " . $stmt->error . "\n";
}

$stmt->close();
$koneksi->close();
?>
