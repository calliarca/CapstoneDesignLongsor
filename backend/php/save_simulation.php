<?php

require_once 'logger.php'; // Sesuaikan path jika perlu
$script_name = basename(__FILE__);
date_default_timezone_set('Asia/Jakarta'); // Atur zona waktu default untuk konsistensi timestamp server

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Sesuaikan untuk produksi
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Konfigurasi database
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "simulator_longsor";

// Rentang Nilai Valid (sesuai diagram alir Anda)
define("MIN_KELEMBABAN", 0);
define("MAX_KELEMBABAN", 100);
define("MIN_KEMIRINGAN_INPUT", 0);
define("MAX_KEMIRINGAN_INPUT", 45);
define("MIN_KEMIRINGAN_OUTPUT", 0);
define("MAX_KEMIRINGAN_OUTPUT", 45);
define("MIN_CURAH_HUJAN_INPUT", 0);
define("MAX_CURAH_HUJAN_INPUT", 25);
define("MIN_CURAH_HUJAN_OUTPUT", 0);
define("MAX_CURAH_HUJAN_OUTPUT", 25);

// Threshold Outlier
define("OUTLIER_KEMIRINGAN_DEVIATION", 10); // Derajat, deviasi antara input dan output
define("OUTLIER_CURAHHUJAN_DEVIATION", 50); // mm, deviasi antara input dan output
define("OUTLIER_KELEMBABAN_DEVIATION_PERCENT", 30); // Persen, deviasi dari rata-rata kelembapan lain
// --- AKHIR KONFIGURASI ---

write_log($script_name, 'INFO', 'Memulai proses penyimpanan simulasi tunggal.');

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    $error_msg = "Koneksi database gagal: " . $conn->connect_error;
    write_log($script_name, 'ERROR', $error_msg);
    echo json_encode(["status" => "error", "message" => "Database connection failed: " . $conn->connect_error]);
    exit;
}
write_log($script_name, 'INFO', 'Koneksi database berhasil.');
$conn->set_charset("utf8mb4"); // Disarankan untuk encoding yang baik

$json = file_get_contents("php://input");
$data = json_decode($json, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    $error_msg = "Data JSON tidak valid.";
    write_log($script_name, 'ERROR', $error_msg, ['raw_input' => mb_substr($json, 0, 500)]); // Log sebagian input jika terlalu besar
    echo json_encode(["status" => "error", "message" => "Invalid JSON data received."]);
    $conn->close();
    exit;
}
write_log($script_name, 'INFO', 'Data JSON berhasil di-parse.', $data);

// Sanitasi & konversi data
$simulationName = isset($data['simulationName']) ? trim($data['simulationName']) : 'Untitled Simulation';
$kelembabanTanah1 = isset($data['kelembabanTanah1']) ? floatval($data['kelembabanTanah1']) : 0;
$kelembabanTanah2 = isset($data['kelembabanTanah2']) ? floatval($data['kelembabanTanah2']) : 0;
$kelembabanTanah3 = isset($data['kelembabanTanah3']) ? floatval($data['kelembabanTanah3']) : 0;
$kelembabanTanah4 = isset($data['kelembabanTanah4']) ? floatval($data['kelembabanTanah4']) : 0;
$kelembabanTanah5 = isset($data['kelembabanTanah5']) ? floatval($data['kelembabanTanah5']) : 0;
$kelembabanTanah6 = isset($data['kelembabanTanah6']) ? floatval($data['kelembabanTanah6']) : 0;
$derajatKemiringan = isset($data['derajatKemiringan']) ? floatval($data['derajatKemiringan']) : 0; // Input/setting
$outputKemiringan = isset($data['outputKemiringan']) ? floatval($data['outputKemiringan']) : 0;   // Sensor
$curahHujan = isset($data['curahHujan']) ? floatval($data['curahHujan']) : 0;                   // Input/setting
$outputCurahHujan = isset($data['outputCurahHujan']) ? floatval($data['outputCurahHujan']) : 0; // Sensor

// --- VALIDASI RENTANG NILAI ---
$validation_errors = [];
$kelembaban_fields_values = [
    'Kelembaban Tanah 1' => $kelembabanTanah1, 'Kelembaban Tanah 2' => $kelembabanTanah2,
    'Kelembaban Tanah 3' => $kelembabanTanah3, 'Kelembaban Tanah 4' => $kelembabanTanah4,
    'Kelembaban Tanah 5' => $kelembabanTanah5, 'Kelembaban Tanah 6' => $kelembabanTanah6,
];
foreach ($kelembaban_fields_values as $field_name => $value) {
    if ($value < MIN_KELEMBABAN || $value > MAX_KELEMBABAN) {
        $validation_errors[] = "$field_name ($value) di luar rentang (".MIN_KELEMBABAN."-".MAX_KELEMBABAN.").";
    }
}
if ($derajatKemiringan < MIN_KEMIRINGAN_INPUT || $derajatKemiringan > MAX_KEMIRINGAN_INPUT) {
    $validation_errors[] = "Input Derajat Kemiringan ($derajatKemiringan) di luar rentang (".MIN_KEMIRINGAN_INPUT."-".MAX_KEMIRINGAN_INPUT.").";
}
if ($outputKemiringan < MIN_KEMIRINGAN_OUTPUT || $outputKemiringan > MAX_KEMIRINGAN_OUTPUT) {
    $validation_errors[] = "Output Sensor Kemiringan ($outputKemiringan) di luar rentang (".MIN_KEMIRINGAN_OUTPUT."-".MAX_KEMIRINGAN_OUTPUT.").";
}
if ($curahHujan < MIN_CURAH_HUJAN_INPUT || $curahHujan > MAX_CURAH_HUJAN_INPUT) {
    $validation_errors[] = "Input Curah Hujan ($curahHujan) di luar rentang (".MIN_CURAH_HUJAN_INPUT."-".MAX_CURAH_HUJAN_INPUT.").";
}
if ($outputCurahHujan < MIN_CURAH_HUJAN_OUTPUT || $outputCurahHujan > MAX_CURAH_HUJAN_OUTPUT) {
    $validation_errors[] = "Output Sensor Curah Hujan ($outputCurahHujan) di luar rentang (".MIN_CURAH_HUJAN_OUTPUT."-".MAX_CURAH_HUJAN_OUTPUT.").";
}

if (!empty($validation_errors)) {
    $error_msg_detail = "Validasi rentang nilai gagal: " . implode(" ", $validation_errors);
    write_log($script_name, 'ERROR', $error_msg_detail, $data);
    echo json_encode(["status" => "error", "message" => $error_msg_detail]);
    $conn->close();
    exit;
}
write_log($script_name, 'INFO', 'Validasi rentang nilai berhasil.', $data);
// --- AKHIR VALIDASI RENTANG NILAI ---

// --- VALIDASI OUTLIER ---
$outlier_flags = [];
if (abs($outputKemiringan - $derajatKemiringan) > OUTLIER_KEMIRINGAN_DEVIATION) {
    $outlier_flags[] = "Output Kemiringan ($outputKemiringan) outlier (deviasi dari input $derajatKemiringan > ".OUTLIER_KEMIRINGAN_DEVIATION.").";
}
if (abs($outputCurahHujan - $curahHujan) > OUTLIER_CURAHHUJAN_DEVIATION) {
    $outlier_flags[] = "Output Curah Hujan ($outputCurahHujan) outlier (deviasi dari input $curahHujan > ".OUTLIER_CURAHHUJAN_DEVIATION.").";
}

$all_kelembaban_values_for_avg = [];
foreach($kelembaban_fields_values as $val) { // Gunakan nilai yang sudah divalidasi rentangnya
    $all_kelembaban_values_for_avg[] = $val;
}

$valid_kelembaban_count = count($all_kelembaban_values_for_avg); // Semua sudah divalidasi rentangnya
$sum_kelembaban = array_sum($all_kelembaban_values_for_avg);

if ($valid_kelembaban_count > 1) {
    $avg_kelembaban = $sum_kelembaban / $valid_kelembaban_count;
    foreach ($kelembaban_fields_values as $field_name => $value) {
        $deviation_percent = 0;
        if ($avg_kelembaban == 0) {
            if ($value != 0) $deviation_percent = 100.0; // Deviasi tak terhingga jika avg 0 dan value tidak 0
        } else {
            $deviation_percent = abs(($value - $avg_kelembaban) / $avg_kelembaban) * 100;
        }
        if ($deviation_percent > OUTLIER_KELEMBABAN_DEVIATION_PERCENT) {
            $outlier_flags[] = "$field_name ($value) outlier (deviasi ".number_format($deviation_percent, 1)."% dari rata-rata ".number_format($avg_kelembaban,1).").";
        }
    }
} elseif ($valid_kelembaban_count == 1 && count($kelembaban_fields_values) > 1) {
    write_log($script_name, 'INFO_OUTLIER', "Hanya satu sensor kelembaban, tidak bisa perbandingan outlier antar sensor.", $data);
}


if (!empty($outlier_flags)) {
    $outlier_msg_detail = "Data ditolak karena terdeteksi outlier: " . implode(" ", $outlier_flags);
    write_log($script_name, 'ERROR_OUTLIER', $outlier_msg_detail, $data);
    echo json_encode(["status" => "error", "message" => $outlier_msg_detail]);
    $conn->close();
    exit;
}
write_log($script_name, 'INFO', 'Pengecekan outlier berhasil, tidak ada outlier terdeteksi.', $data);
// --- AKHIR VALIDASI OUTLIER ---

// --- SIMPAN DATA KE DATABASE ---
// Handle client_timestamp
// Handle client_timestamp
$createdAt = date('Y-m-d H:i:s');
if (isset($data['client_timestamp'])) {
    try {
        // Validasi format ISO 8601 yang lebih ketat
        if (preg_match('/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[\+\-]\d{2}:\d{2})$/', $data['client_timestamp'])) {
            $dateTime = new DateTime($data['client_timestamp']);
            $createdAt = $dateTime->format('Y-m-d H:i:s'); // Simpan sebagai UTC atau sesuai kebutuhan server
            write_log($script_name, 'INFO', 'Timestamp klien berhasil di-parse.', ['client_ts' => $data['client_timestamp'], 'formatted_ts' => $createdAt]);
        } else {
            throw new Exception("Format timestamp tidak sesuai ISO 8601.");
        }
    } catch (Exception $e) {
        write_log($script_name, 'WARN', "Format timestamp klien tidak valid (".$e->getMessage()."), menggunakan waktu server.", ['client_ts' => $data['client_timestamp']]);
    }
} else {
    write_log($script_name, 'WARN', "Timestamp klien tidak dikirim, menggunakan waktu server.");
}

// --- PENGECEKAN DUPLIKASI DATA ---
$stmt_check = $conn->prepare("SELECT id FROM simulations WHERE simulation_name = ? AND created_at = ? LIMIT 1");
if ($stmt_check === false) {
    write_log($script_name, 'ERROR', "SQL prepare (cek duplikat) gagal: " . $conn->error);
} else {
    $stmt_check->bind_param("ss", $simulationName, $createdAt);
    if ($stmt_check->execute()) {
        $stmt_check->store_result();
        if ($stmt_check->num_rows > 0) {
            $warn_msg = "Data simulasi duplikat (nama dan timestamp sama). Tidak disimpan ulang.";
            write_log($script_name, 'WARN_DUPLICATE', $warn_msg, ['name' => $simulationName, 'timestamp' => $createdAt]);
            echo json_encode(["status" => "warning", "message" => "Data with this name and timestamp already exists. Not saved again."]);
            $stmt_check->close();
            $conn->close();
            exit;
        }
        write_log($script_name, 'INFO', 'Pengecekan duplikasi: data unik.', ['name' => $simulationName, 'timestamp' => $createdAt]);
    } else {
        write_log($script_name, 'ERROR', "Eksekusi cek duplikat gagal: " . $stmt_check->error);
    }
    $stmt_check->close();
}
// --- AKHIR PENGECEKAN DUPLIKASI DATA ---

$sql_insert = "INSERT INTO simulations (
            simulation_name, kelembaban_tanah_1, kelembaban_tanah_2, kelembaban_tanah_3, 
            kelembaban_tanah_4, kelembaban_tanah_5, kelembaban_tanah_6,
            derajat_kemiringan, output_kemiringan, curah_hujan, output_curah_hujan, 
            is_active, created_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)";

$stmt_insert = $conn->prepare($sql_insert);
if ($stmt_insert === false) {
    $error_msg = "SQL prepare (insert) gagal: " . $conn->error;
    write_log($script_name, 'ERROR', $error_msg);
    echo json_encode(["status" => "error", "message" => "SQL prepare for insert failed: " . $conn->error]);
    $conn->close();
    exit;
}

$stmt_insert->bind_param(
    "sdddddddddds", 
    $simulationName, 
    $kelembabanTanah1, $kelembabanTanah2, $kelembabanTanah3, 
    $kelembabanTanah4, $kelembabanTanah5, $kelembabanTanah6, 
    $derajatKemiringan, $outputKemiringan, 
    $curahHujan, $outputCurahHujan,
    $createdAt
);

if ($stmt_insert->execute()) {
    $success_msg = "Data simulasi berhasil disimpan.";
    write_log($script_name, 'SUCCESS', $success_msg, ['name' => $simulationName, 'id' => $stmt_insert->insert_id]);
    echo json_encode(["status" => "success", "message" => "Simulation data saved successfully."]);
} else {
    $error_msg = "Gagal menyimpan data simulasi: " . $stmt_insert->error;
    write_log($script_name, 'ERROR', $error_msg, ['name' => $simulationName, 'sql_error_no' => $stmt_insert->errno]);
    if ($stmt_insert->errno == 1062) { // Error MySQL untuk duplicate entry
         echo json_encode(["status" => "error", "message" => "Error: Duplicate entry detected by database."]);
    } else {
         echo json_encode(["status" => "error", "message" => "Error executing insert query: " . $stmt_insert->error]);
    }
}

$stmt_insert->close();
$conn->close();
write_log($script_name, 'INFO', 'Proses penyimpanan simulasi tunggal selesai.');
?>