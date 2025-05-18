<?php
date_default_timezone_set("Asia/Jakarta");

// Koneksi ke database
$host = "localhost";
$user = "root";
$pass = "";
$db = "simulator_longsor";

$koneksi = new mysqli($host, $user, $pass, $db);
if ($koneksi->connect_error) {
    die(json_encode(["status" => "error", "message" => "Koneksi gagal: " . $koneksi->connect_error]));
}

// Ambil simulation_name yang aktif
$getSimName = $koneksi->query("SELECT simulation_name FROM simulations 
                               WHERE is_active = 1 
                               ORDER BY id DESC LIMIT 1");
if (!$getSimName) {
    echo json_encode(["status" => "error", "message" => "Error mengambil data simulasi: " . $koneksi->error]);
    exit;
}

$simNameRow = $getSimName->fetch_assoc();
$simulationName = $simNameRow['simulation_name'] ?? null;

if (empty($simulationName)) {
    echo json_encode([
        "status" => "warning",
        "message" => "Tidak ada simulasi aktif. Data tidak disimpan."
    ]);
    exit;
}

// Ambil channel ID untuk output_kemiringan dari config
$configFile = __DIR__ . '../../assets/js/channel_config.json';
if (!file_exists($configFile)) {
    echo json_encode(["status" => "error", "message" => "File konfigurasi tidak ditemukan."]);
    exit;
}

$config = json_decode(file_get_contents($configFile), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["status" => "error", "message" => "Error parsing file konfigurasi."]);
    exit;
}

$outputChannelId = $config['slope_channel_id'] ?? null;

if (!$outputChannelId) {
    echo json_encode(["status" => "error", "message" => "Channel ID output tidak tersedia di konfigurasi."]);
    exit;
}

// URL ThingSpeak
$urlDerajat = "https://api.thingspeak.com/channels/2963900/feeds.json?results=1";  // derajat_kemiringan
$urlOutput  = "https://api.thingspeak.com/channels/{$outputChannelId}/feeds.json?results=1";  // output_kemiringan

// Ambil data dengan error handling
$options = [
    'http' => [
        'timeout' => 10, // Timeout 10 detik
        'ignore_errors' => true
    ]
];
$context = stream_context_create($options);

$derajatResp = @file_get_contents($urlDerajat, false, $context);
$outputResp = @file_get_contents($urlOutput, false, $context);

if ($derajatResp === false || $outputResp === false) {
    $error = error_get_last();
    echo json_encode(["status" => "error", "message" => "Gagal mengambil data dari ThingSpeak: " . ($error['message'] ?? 'Unknown error')]);
    exit;
}

$derajatData = json_decode($derajatResp, true);
$outputData = json_decode($outputResp, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["status" => "error", "message" => "Error parsing data dari ThingSpeak."]);
    exit;
}

$feedDerajat = $derajatData['feeds'][0] ?? null;
$feedOutput = $outputData['feeds'][0] ?? null;

if (!$feedDerajat || !$feedOutput) {
    echo json_encode(["status" => "error", "message" => "Feed kosong dari salah satu channel."]);
    exit;
}

// Format data dan waktu - GUNAKAN TIMESTAMP DARI OUTPUT (FEED 2)
$created_at = date("Y-m-d H:i:s", strtotime($feedOutput['created_at']));
$derajat = isset($feedDerajat['field1']) ? floatval($feedDerajat['field1']) : 0;
$output = isset($feedOutput['field2']) ? floatval($feedOutput['field2']) : 0;

// Pengecekan duplikasi yang lebih ketat
$stmt = $koneksi->prepare("SELECT id FROM simulations 
                          WHERE simulation_name = ? 
                          AND created_at = ? 
                          LIMIT 1");
$stmt->bind_param("ss", $simulationName, $created_at);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode([
        "status" => "warning",
        "message" => "Data dengan timestamp yang sama sudah ada. Tidak disimpan ulang.",
        "derajat" => $derajat,
        "output" => $output,
        "created_at" => $created_at
    ]);
    $stmt->close();
    $koneksi->close();
    exit;
}
$stmt->close();

// Simpan ke database
$stmt = $koneksi->prepare("INSERT INTO simulations (simulation_name, derajat_kemiringan, output_kemiringan, created_at) 
                          VALUES (?, ?, ?, ?)");
$stmt->bind_param("sdds", $simulationName, $derajat, $output, $created_at);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "Data berhasil disimpan",
        "derajat" => $derajat,
        "output" => $output,
        "created_at" => $created_at
    ]);
} else {
    // Cek jika error karena duplikasi (meskipun sudah dicek sebelumnya)
    if ($koneksi->errno == 1062) { // Error code for duplicate entry
        echo json_encode([
            "status" => "warning",
            "message" => "Data sudah ada (dicek melalui error database). Tidak disimpan ulang.",
            "derajat" => $derajat,
            "output" => $output,
            "created_at" => $created_at
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyimpan data: " . $stmt->error]);
    }
}

$stmt->close();
$koneksi->close();
?>