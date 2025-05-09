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

// Lock database untuk mencegah race condition
$koneksi->query("LOCK TABLES simulations WRITE");

try {
    // Ambil simulation_name terakhir yang aktif
    $getSimName = $koneksi->query("SELECT simulation_name FROM simulations 
                                 WHERE is_active = 1 
                                 ORDER BY id DESC LIMIT 1");
    $simNameRow = $getSimName->fetch_assoc();
    $simulationName = $simNameRow['simulation_name'] ?? null;

    if (empty($simulationName)) {
        throw new Exception("Tidak ada simulasi aktif");
    }

    // Ambil nilai terakhir dari database
    $getLastValue = $koneksi->query("SELECT derajat_kemiringan, output_kemiringan 
                                   FROM simulations 
                                   WHERE simulation_name = '$simulationName' 
                                   ORDER BY created_at DESC LIMIT 1");
    $lastValue = $getLastValue->fetch_assoc();
    $last_derajat = $lastValue['derajat_kemiringan'] ?? 0;
    $last_output = $lastValue['output_kemiringan'] ?? 0;

    // Konfigurasi ThingSpeak
    $configFile = __DIR__ . '/../assets/js/channel_config.json';
    $config = json_decode(file_get_contents($configFile), true);
    $slopeChannelId = $config['slope_channel_id'] ?? '2889619';

    // Ambil data terbaru dari ThingSpeak
    $url = "https://api.thingspeak.com/channels/$slopeChannelId/feeds.json?results=1";
    $context = stream_context_create(['http' => ['timeout' => 10]]);
    $response = @file_get_contents($url, false, $context);

    if ($response !== false) {
        $data = json_decode($response, true);
        $feed = $data['feeds'][0] ?? null;

        if ($feed) {
            $created_at = date("Y-m-d H:i:s", strtotime($feed['created_at']));
            $derajat = isset($feed['field1']) ? floatval($feed['field1']) : $last_derajat;
            $output = isset($feed['field2']) ? floatval($feed['field2']) : $last_output;

            // Jika nilai 10 derajat sudah pernah dikirim, pertahankan
            if ($last_derajat == 10 && $derajat == 0) {
                $derajat = 10; // Pertahankan nilai 10
            }

            // Simpan ke database
            $query = "INSERT INTO simulations (simulation_name, derajat_kemiringan, output_kemiringan, created_at) 
                      VALUES (?, ?, ?, ?)";
            $stmt = $koneksi->prepare($query);
            $stmt->bind_param("sdds", $simulationName, $derajat, $output, $created_at);
            
            if (!$stmt->execute()) {
                throw new Exception("Gagal menyimpan data");
            }
            
            echo json_encode([
                "status" => "success",
                "message" => "Data processed",
                "derajat" => $derajat,
                "output" => $output,
                "persisted" => ($derajat == 10 && $last_derajat == 10) ? "Nilai 10 dipertahankan" : "Nilai normal"
            ]);
        } else {
            throw new Exception("Data feed kosong");
        }
    } else {
        // Jika gagal ambil dari ThingSpeak, gunakan nilai terakhir
        echo json_encode([
            "status" => "warning",
            "message" => "Using last known value",
            "derajat" => $last_derajat,
            "output" => $last_output
        ]);
    }
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
} finally {
    $koneksi->query("UNLOCK TABLES");
    $koneksi->close();
}
?>