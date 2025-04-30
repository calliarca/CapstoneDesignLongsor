<?php
date_default_timezone_set("Asia/Jakarta");

// Koneksi ke database
$host = "localhost";
$user = "root";
$pass = "";
$db = "simulator_longsor";

$koneksi = new mysqli($host, $user, $pass, $db);
if ($koneksi->connect_error) {
    die("❌ Koneksi gagal: " . $koneksi->connect_error);
}

// Ambil simulation_name terakhir yang aktif
$getSimName = $koneksi->query("SELECT simulation_name FROM simulations 
                               WHERE is_active = 1 
                               ORDER BY id DESC LIMIT 1");
$simNameRow = $getSimName->fetch_assoc();
$simulationName = $simNameRow['simulation_name'] ?? null;

if (empty($simulationName)) {
    echo "⚠️ Tidak ada simulasi aktif. Data tidak disimpan.\n";
    exit;
}

// Ambil data terbaru dari ThingSpeak
$url = "https://api.thingspeak.com/channels/2889619/feeds.json?results=1";
$response = @file_get_contents($url);

if ($response === false) {
    die("❌ Gagal mengambil data dari ThingSpeak.");
}

$data = json_decode($response, true);
$feed = $data['feeds'][0] ?? null;

if ($feed) {
    $created_at = date("Y-m-d H:i:s", strtotime($feed['created_at']));

    // Ambil field2 (output kemiringan)
    if (isset($feed['field2']) && $feed['field2'] !== null) {
        $output_kemiringan = floatval($feed['field2']);
    } else {
        $getLastOutput = $koneksi->query("SELECT output_kemiringan FROM simulations 
                                          WHERE simulation_name = '$simulationName' 
                                          AND output_kemiringan IS NOT NULL 
                                          ORDER BY created_at DESC LIMIT 1");
        $lastOutRow = $getLastOutput->fetch_assoc();
        $output_kemiringan = $lastOutRow['output_kemiringan'] ?? 0.0;
        echo "⚠️ field2 kosong, menggunakan output sebelumnya: $output_kemiringan\n";
    }

    // Ambil field1 (derajat kemiringan)
    if (isset($feed['field1']) && $feed['field1'] !== null) {
        $derajat_kemiringan = floatval($feed['field1']);
        // Simpan nilai baru field1 ke database
        $queryUpdate = "UPDATE simulations 
                        SET derajat_kemiringan = $derajat_kemiringan 
                        WHERE simulation_name = '$simulationName' 
                        AND derajat_kemiringan IS NULL 
                        LIMIT 1";
        $koneksi->query($queryUpdate);
    } else {
        $getLastKemiringan = $koneksi->query("SELECT derajat_kemiringan FROM simulations 
                                              WHERE simulation_name = '$simulationName' 
                                              AND derajat_kemiringan IS NOT NULL 
                                              ORDER BY created_at DESC LIMIT 1");
        $lastRow = $getLastKemiringan->fetch_assoc();
        $derajat_kemiringan = $lastRow['derajat_kemiringan'] ?? 0.0;
        echo "⚠️ field1 kosong, menggunakan derajat sebelumnya: $derajat_kemiringan\n";
    }

    // Periksa jika data field1 sudah ada nilai valid dan field2 kosong
    if ($derajat_kemiringan !== 0.0 && $output_kemiringan === 0.0) {
        echo "⚠️ Data field2 kosong, tapi field1 sudah ada nilai. Menyimpan nilai field1 dan output terakhir.\n";
        $output_kemiringan = $lastOutRow['output_kemiringan'] ?? 0.0;
    }

    // Cek apakah data dengan kombinasi waktu dan nilai output sudah ada
    $cek = $koneksi->query("SELECT * FROM simulations 
                            WHERE simulation_name = '$simulationName' 
                            AND created_at = '$created_at' 
                            AND output_kemiringan = $output_kemiringan");

    if ($cek->num_rows == 0) {
        // Simpan data
        $query = "INSERT INTO simulations (simulation_name, derajat_kemiringan, output_kemiringan, created_at) 
                  VALUES ('$simulationName', $derajat_kemiringan, $output_kemiringan, '$created_at')";

        if ($koneksi->query($query)) {
            echo "✅ Data berhasil disimpan: derajat = $derajat_kemiringan, output = $output_kemiringan, waktu = $created_at\n";
        } else {
            echo "❌ Gagal menyimpan data: " . $koneksi->error . "\n";
        }
    } else {
        echo "⚠️ Data duplikat terdeteksi (waktu + output). Tidak disimpan ulang.\n";
    }
} else {
    echo "❌ Data dari ThingSpeak tidak tersedia. Tidak disimpan.\n";
}
?>
