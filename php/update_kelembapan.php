<?php
date_default_timezone_set("Asia/Jakarta");

// Koneksi ke database
$host = "localhost";
$user = "root";
$pass = "";
$db = "simulator_longsor";

$koneksi = new mysqli($host, $user, $pass, $db);
if ($koneksi->connect_error) {
    die("Koneksi gagal: " . $koneksi->connect_error);
}

// --- Load Channel Configuration ---
$configFile = '/channel_config.json';

// Cek apakah file konfigurasi ada
if (!file_exists($configFile)) {
    // Buat file konfigurasi default jika tidak ada
    $defaultConfig = [
        'humidity_channel_id' => '2843704', // ID channel default kelembaban
        'slope_channel_id' => '2843705'    // ID channel default kemiringan
    ];
    file_put_contents($configFile, json_encode($defaultConfig, JSON_PRETTY_PRINT));
    echo "⚠️ File konfigurasi tidak ditemukan. File default telah dibuat.\n";
}

// Baca konfigurasi
$config = json_decode(file_get_contents($configFile), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("❌ Gagal membaca file konfigurasi: " . json_last_error_msg());
}

$humidityChannelId = $config['humidity_channel_id'] ?? '2843704'; // Fallback ke default jika tidak ada

// Ambil simulation_name aktif
$getSimName = $koneksi->query("SELECT simulation_name FROM simulations 
                               WHERE is_active = 1 
                               ORDER BY id DESC LIMIT 1");
$simNameRow = $getSimName->fetch_assoc();
$simulationName = $simNameRow['simulation_name'] ?? null;

if (empty($simulationName)) {
    echo "⚠️ Tidak ada simulasi aktif. Data tidak disimpan.\n";
    exit;
}

// --- Ambil data kelembaban ---
$kelembabanURL = "https://api.thingspeak.com/channels/$humidityChannelId/feeds.json?results=1";
$kelembabanResponse = @file_get_contents($kelembabanURL);

if ($kelembabanResponse === false) {
    echo "❌ Gagal mengambil data dari ThingSpeak. Channel ID: $humidityChannelId\n";
    exit;
}

$kelembabanData = json_decode($kelembabanResponse, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ Gagal memparsing data JSON dari ThingSpeak: " . json_last_error_msg() . "\n";
    exit;
}

$kelembabanFeed = $kelembabanData['feeds'][0] ?? null;

if ($kelembabanFeed) {
    $kelembaban = [
        floatval($kelembabanFeed['field1'] ?? 0),
        floatval($kelembabanFeed['field2'] ?? 0),
        floatval($kelembabanFeed['field3'] ?? 0),
        floatval($kelembabanFeed['field4'] ?? 0),
        floatval($kelembabanFeed['field5'] ?? 0),
        floatval($kelembabanFeed['field6'] ?? 0),
    ];
    $created_at_kelembaban = date("Y-m-d H:i:s", strtotime($kelembabanFeed['created_at']));
} else {
    $kelembaban = null;
    $created_at_kelembaban = null;
}

// --- Cek apakah sudah ada data kelembaban pada waktu yang sama ---
if ($created_at_kelembaban) {
    $cekKelembaban = $koneksi->query("SELECT * FROM simulations WHERE created_at = '$created_at_kelembaban'");
    if ($cekKelembaban->num_rows == 0) {
        // Jika belum ada, simpan data kelembaban
        $queryKelembaban = "
            INSERT INTO simulations (
                simulation_name, kelembaban_tanah_1, kelembaban_tanah_2, kelembaban_tanah_3,
                kelembaban_tanah_4, kelembaban_tanah_5, kelembaban_tanah_6, created_at
            ) VALUES (
                '$simulationName',
                {$kelembaban[0]}, {$kelembaban[1]}, {$kelembaban[2]},
                {$kelembaban[3]}, {$kelembaban[4]}, {$kelembaban[5]},
                '$created_at_kelembaban'
            )
        ";
        if ($koneksi->query($queryKelembaban)) {
            echo "✅ Data kelembaban berhasil disimpan: $created_at_kelembaban (Channel ID: $humidityChannelId)\n";
        } else {
            echo "❌ Gagal menyimpan data kelembaban: " . $koneksi->error . "\n";
        }
    } else {
        echo "⚠️ Data kelembaban dengan waktu yang sama sudah ada. Tidak perlu menyimpan lagi.\n";
    }
} else {
    echo "⚠️ Data kelembaban tidak tersedia. Tidak ada data yang disimpan.\n";
}

// Tutup koneksi database
$koneksi->close();
?>