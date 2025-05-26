<?php
// save_simulation_batch.php

require_once 'logger.php'; // Sesuaikan path jika perlu
$script_name = basename(__FILE__);
date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // TODO: Sesuaikan untuk produksi
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// --- KONFIGURASI VALIDASI & DATABASE ---
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "simulator_longsor";

// Rentang Nilai Valid (sesuai diagram alir Anda)
define("MIN_KELEMBABAN_DP", 0);
define("MAX_KELEMBABAN_DP", 100);
define("MIN_KEMIRINGAN_INPUT_BATCH", 0);
define("MAX_KEMIRINGAN_INPUT_BATCH", 45);
define("MIN_KEMIRINGAN_OUTPUT_DP", 0);
define("MAX_KEMIRINGAN_OUTPUT_DP", 45);
define("MIN_CURAH_HUJAN_INPUT_BATCH", 0);
define("MAX_CURAH_HUJAN_INPUT_BATCH", 200);
define("MIN_CURAH_HUJAN_OUTPUT_DP", 0);
define("MAX_CURAH_HUJAN_OUTPUT_DP", 200);

// Threshold Outlier
define("OUTLIER_KEMIRINGAN_DEVIATION_DP", 10); // Derajat
define("OUTLIER_CURAHHUJAN_DEVIATION_DP", 50); // mm
define("OUTLIER_KELEMBABAN_DEVIATION_PERCENT_DP", 30); // Persen
// --- AKHIR KONFIGURASI ---

write_log($script_name, 'INFO', 'Memulai proses penyimpanan batch simulasi.');

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    $error_msg = "Koneksi database gagal: " . $conn->connect_error;
    write_log($script_name, 'ERROR', $error_msg);
    echo json_encode(["status" => "error", "message" => "Database connection failed: " . $conn->connect_error]);
    exit;
}
write_log($script_name, 'INFO', 'Koneksi database berhasil.');
$conn->set_charset("utf8mb4");

$jsonPayload = file_get_contents("php://input");
$payload = json_decode($jsonPayload, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload) || 
    !isset($payload['simulationName']) || !isset($payload['dataPoints']) || !is_array($payload['dataPoints'])) {
    $error_msg = "Data JSON tidak valid atau field wajib (simulationName, dataPoints) hilang.";
    write_log($script_name, 'ERROR', $error_msg, ['raw_input' => mb_substr($jsonPayload, 0, 500)]);
    echo json_encode(["status" => "error", "message" => "Invalid JSON data or missing required fields."]);
    $conn->close();
    exit;
}
write_log($script_name, 'INFO', 'Data JSON batch berhasil di-parse.', ['simulationName' => $payload['simulationName'], 'numDataPoints' => count($payload['dataPoints'])]);

$simulationName = trim($payload['simulationName']);
$derajatKemiringanInput = isset($payload['derajatKemiringanInput']) ? floatval($payload['derajatKemiringanInput']) : 0;
$curahHujanInput = isset($payload['curahHujanInput']) ? floatval($payload['curahHujanInput']) : 0;
$dataPoints = $payload['dataPoints'];

if (empty($simulationName) || empty($dataPoints)) {
    $error_msg = "Nama simulasi atau data points tidak boleh kosong.";
    write_log($script_name, 'ERROR', $error_msg, $payload);
    echo json_encode(["status" => "error", "message" => "Simulation name or data points cannot be empty."]);
    $conn->close();
    exit;
}

// Validasi rentang untuk input batch (derajatKemiringanInput & curahHujanInput)
$batch_input_validation_errors = [];
if ($derajatKemiringanInput < MIN_KEMIRINGAN_INPUT_BATCH || $derajatKemiringanInput > MAX_KEMIRINGAN_INPUT_BATCH) {
    $batch_input_validation_errors[] = "Input Derajat Kemiringan Batch ($derajatKemiringanInput) di luar rentang (".MIN_KEMIRINGAN_INPUT_BATCH."-".MAX_KEMIRINGAN_INPUT_BATCH.").";
}
if ($curahHujanInput < MIN_CURAH_HUJAN_INPUT_BATCH || $curahHujanInput > MAX_CURAH_HUJAN_INPUT_BATCH) {
    $batch_input_validation_errors[] = "Input Curah Hujan Batch ($curahHujanInput) di luar rentang (".MIN_CURAH_HUJAN_INPUT_BATCH."-".MAX_CURAH_HUJAN_INPUT_BATCH.").";
}

if (!empty($batch_input_validation_errors)) {
    $error_msg_detail = "Validasi rentang nilai input batch gagal: " . implode(" ", $batch_input_validation_errors);
    write_log($script_name, 'ERROR', $error_msg_detail, $payload);
    echo json_encode(["status" => "error", "message" => $error_msg_detail]);
    $conn->close();
    exit;
}
write_log($script_name, 'INFO', 'Validasi rentang nilai input batch berhasil.', ['derajatKemiringanInput' => $derajatKemiringanInput, 'curahHujanInput' => $curahHujanInput]);

$sql_insert_dp = "INSERT INTO simulations (
            simulation_name, 
            kelembaban_tanah_1, kelembaban_tanah_2, kelembaban_tanah_3, 
            kelembaban_tanah_4, kelembaban_tanah_5, kelembaban_tanah_6,
            derajat_kemiringan, output_kemiringan, 
            curah_hujan, output_curah_hujan, 
            is_active, created_at 
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)";

$stmt_insert_dp = $conn->prepare($sql_insert_dp);
if ($stmt_insert_dp === false) {
    $error_msg = "SQL prepare (insert batch data point) gagal: " . $conn->error;
    write_log($script_name, 'ERROR', $error_msg);
    echo json_encode(["status" => "error", "message" => "SQL prepare for batch insert failed: " . $conn->error]);
    $conn->close();
    exit;
}

$conn->begin_transaction();
write_log($script_name, 'INFO', 'Memulai transaksi database untuk batch.', ['simulationName' => $simulationName]);
$successCount = 0;
$skipped_duplicate = 0;
$skipped_range_error = 0;
$skipped_outlier_error = 0;
$db_error_count = 0;
$db_errors_details = [];
$totalDataPoints = count($dataPoints);

foreach ($dataPoints as $index => $dp) {
    $processedIndex = $index + 1;
    $log_dp_context = array_merge($dp, ['dp_index' => $processedIndex]); // Untuk logging
    write_log($script_name, 'INFO_DP', "Memproses DP #$processedIndex dari $totalDataPoints.", $log_dp_context);

    $kt1 = isset($dp['kelembabanTanah1']) ? floatval($dp['kelembabanTanah1']) : 0;
    $kt2 = isset($dp['kelembabanTanah2']) ? floatval($dp['kelembabanTanah2']) : 0;
    $kt3 = isset($dp['kelembabanTanah3']) ? floatval($dp['kelembabanTanah3']) : 0;
    $kt4 = isset($dp['kelembabanTanah4']) ? floatval($dp['kelembabanTanah4']) : 0;
    $kt5 = isset($dp['kelembabanTanah5']) ? floatval($dp['kelembabanTanah5']) : 0;
    $kt6 = isset($dp['kelembabanTanah6']) ? floatval($dp['kelembabanTanah6']) : 0;
    $outputKemiringan = isset($dp['outputKemiringan']) ? floatval($dp['outputKemiringan']) : 0;
    $outputCurahHujan = isset($dp['outputCurahHujan']) ? floatval($dp['outputCurahHujan']) : 0;

    // --- VALIDASI RENTANG NILAI PER DATA POINT ---
    $dp_range_validation_errors = [];
    $current_dp_kelembaban_fields = ['KT1'=>$kt1, 'KT2'=>$kt2, 'KT3'=>$kt3, 'KT4'=>$kt4, 'KT5'=>$kt5, 'KT6'=>$kt6];
    foreach ($current_dp_kelembaban_fields as $fname => $fval) {
        if ($fval < MIN_KELEMBABAN_DP || $fval > MAX_KELEMBABAN_DP) {
            $dp_range_validation_errors[] = "$fname ($fval) di luar rentang (".MIN_KELEMBABAN_DP."-".MAX_KELEMBABAN_DP.").";
        }
    }
    if ($outputKemiringan < MIN_KEMIRINGAN_OUTPUT_DP || $outputKemiringan > MAX_KEMIRINGAN_OUTPUT_DP) {
        $dp_range_validation_errors[] = "Output Kemiringan ($outputKemiringan) di luar rentang (".MIN_KEMIRINGAN_OUTPUT_DP."-".MAX_KEMIRINGAN_OUTPUT_DP.").";
    }
    if ($outputCurahHujan < MIN_CURAH_HUJAN_OUTPUT_DP || $outputCurahHujan > MAX_CURAH_HUJAN_OUTPUT_DP) {
        $dp_range_validation_errors[] = "Output Curah Hujan ($outputCurahHujan) di luar rentang (".MIN_CURAH_HUJAN_OUTPUT_DP."-".MAX_CURAH_HUJAN_OUTPUT_DP.").";
    }

    if (!empty($dp_range_validation_errors)) {
        $err_msg_range_dp = "Validasi rentang gagal untuk DP #$processedIndex: " . implode(" ", $dp_range_validation_errors);
        write_log($script_name, 'SKIP_DP_RANGE', $err_msg_range_dp, $log_dp_context);
        $skipped_range_error++;
        continue;
    }
    // --- AKHIR VALIDASI RENTANG NILAI PER DATA POINT ---

    // --- VALIDASI OUTLIER PER DATA POINT ---
    $dp_outlier_flags = [];
    if (abs($outputKemiringan - $derajatKemiringanInput) > OUTLIER_KEMIRINGAN_DEVIATION_DP) {
        $dp_outlier_flags[] = "Output Kemiringan ($outputKemiringan) outlier (deviasi dari input batch $derajatKemiringanInput > ".OUTLIER_KEMIRINGAN_DEVIATION_DP.").";
    }
    if (abs($outputCurahHujan - $curahHujanInput) > OUTLIER_CURAHHUJAN_DEVIATION_DP) {
        $dp_outlier_flags[] = "Output Curah Hujan ($outputCurahHujan) outlier (deviasi dari input batch $curahHujanInput > ".OUTLIER_CURAHHUJAN_DEVIATION_DP.").";
    }
    
    $dp_kelembaban_avg_list = [];
    foreach($current_dp_kelembaban_fields as $fval) { $dp_kelembaban_avg_list[] = $fval; }
    $dp_valid_kt_count = count($dp_kelembaban_avg_list);
    $dp_sum_kt = array_sum($dp_kelembaban_avg_list);

    if ($dp_valid_kt_count > 1) {
        $dp_avg_kt = $dp_sum_kt / $dp_valid_kt_count;
        foreach($current_dp_kelembaban_fields as $fname => $fval) {
            $dp_dev_percent = 0;
            if ($dp_avg_kt == 0) {
                if ($fval != 0) $dp_dev_percent = 100.0;
            } else {
                $dp_dev_percent = abs(($fval - $dp_avg_kt) / $dp_avg_kt) * 100;
            }
            if ($dp_dev_percent > OUTLIER_KELEMBABAN_DEVIATION_PERCENT_DP) {
                $dp_outlier_flags[] = "$fname ($fval) outlier (deviasi ".number_format($dp_dev_percent,1)."% dari rata-rata ".number_format($dp_avg_kt,1).").";
            }
        }
    }

    if (!empty($dp_outlier_flags)) {
        $err_msg_outlier_dp = "DP #$processedIndex ditolak karena outlier: " . implode(" ", $dp_outlier_flags);
        write_log($script_name, 'SKIP_DP_OUTLIER', $err_msg_outlier_dp, $log_dp_context);
        $skipped_outlier_error++;
        continue;
    }
    // --- AKHIR VALIDASI OUTLIER PER DATA POINT ---
    
    $clientTimestamp = isset($dp['client_timestamp']) ? $dp['client_timestamp'] : null;
    $formattedTimestamp = date('Y-m-d H:i:s');
    if ($clientTimestamp) {
        try {
            if (preg_match('/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[\+\-]\d{2}:\d{2})$/', $clientTimestamp)) {
                $dateTime = new DateTime($clientTimestamp);
                $formattedTimestamp = $dateTime->format('Y-m-d H:i:s');
            } else {
                throw new Exception("Format timestamp tidak sesuai ISO 8601.");
            }
        } catch (Exception $e) {
            write_log($script_name, 'WARN_DP_TS', "Format TS klien tidak valid untuk DP #$processedIndex (".$e->getMessage()."), pakai waktu server.", array_merge($log_dp_context, ['client_ts' => $clientTimestamp]));
        }
    } else {
        write_log($script_name, 'WARN_DP_TS', "TS klien tidak ada untuk DP #$processedIndex, pakai waktu server.", $log_dp_context);
    }
    
    // --- PENGECEKAN DUPLIKASI DATA PER DATA POINT ---
    $stmt_check_dp = $conn->prepare("SELECT id FROM simulations WHERE simulation_name = ? AND created_at = ? LIMIT 1");
    if ($stmt_check_dp) {
        $stmt_check_dp->bind_param("ss", $simulationName, $formattedTimestamp);
        if ($stmt_check_dp->execute()) {
            $stmt_check_dp->store_result();
            if ($stmt_check_dp->num_rows > 0) {
                $warn_msg_dp_dup = "DP #$processedIndex duplikat (sim '$simulationName', ts '$formattedTimestamp'). Dilewati.";
                write_log($script_name, 'SKIP_DP_DUPLICATE', $warn_msg_dp_dup, $log_dp_context);
                $skipped_duplicate++;
                $stmt_check_dp->close();
                continue; 
            }
        } else {
             write_log($script_name, 'ERROR_DP', "Eksekusi cek duplikat DP #$processedIndex gagal: " . $stmt_check_dp->error, $log_dp_context);
        }
        $stmt_check_dp->close();
    } else {
        write_log($script_name, 'ERROR_DP', "SQL prepare (cek duplikat dp) gagal untuk DP #$processedIndex: " . $conn->error, $log_dp_context);
    }
    // --- AKHIR PENGECEKAN DUPLIKASI DATA PER DATA POINT ---

    $stmt_insert_dp->bind_param(
        "sdddddddddds", 
        $simulationName, 
        $kt1, $kt2, $kt3, $kt4, $kt5, $kt6,
        $derajatKemiringanInput, // Input batch yang berlaku
        $outputKemiringan,      // Sensor aktual dari DP
        $curahHujanInput,       // Input batch yang berlaku
        $outputCurahHujan,      // Sensor aktual dari DP
        $formattedTimestamp
    );

    if ($stmt_insert_dp->execute()) {
        $successCount++;
        write_log($script_name, 'SUCCESS_DP', "DP #$processedIndex berhasil disimpan.", array_merge($log_dp_context,['id' => $stmt_insert_dp->insert_id]));
    } else {
        $error_msg_exec_dp = "Gagal menyimpan DP #$processedIndex: " . $stmt_insert_dp->error;
        write_log($script_name, 'ERROR_DP_EXEC', $error_msg_exec_dp, $log_dp_context);
        $db_errors_details[] = "DP #$processedIndex: " . $stmt_insert_dp->error . ($stmt_insert_dp->errno == 1062 ? " (Duplicate by DB)" : "");
        $db_error_count++;
    }
}

$totalSkipped = $skipped_duplicate + $skipped_range_error + $skipped_outlier_error;

if ($db_error_count === 0) {
    $conn->commit();
    $final_msg = "$successCount dari $totalDataPoints data points berhasil disimpan untuk simulasi '$simulationName'. Total dilewati (duplikat/validasi): $totalSkipped.";
    write_log($script_name, 'SUCCESS_BATCH', $final_msg, ['simName' => $simulationName, 'saved' => $successCount, 'skipped' => $totalSkipped, 'processed' => $totalDataPoints]);
    echo json_encode(["status" => "success", "message" => $final_msg, "processed" => $totalDataPoints, "saved" => $successCount, "skipped_total" => $totalSkipped]);
} else {
    $conn->rollback();
    $final_msg = "Gagal menyimpan data points untuk simulasi '$simulationName' karena error DB. Disimpan sebelum rollback: $successCount. Gagal DB: $db_error_count. Dilewati (duplikat/validasi): $totalSkipped. Transaksi di-rollback.";
    write_log($script_name, 'ERROR_BATCH_DB', $final_msg, ['simName' => $simulationName, 'db_errors' => $db_errors_details, 'saved_before_rollback' => $successCount]);
    echo json_encode(["status" => "error", "message" => $final_msg, "db_errors_details" => $db_errors_details, "processed" => $totalDataPoints, "saved_before_rollback" => $successCount, "skipped_total" => $totalSkipped]);
}

$stmt_insert_dp->close();
$conn->close();
write_log($script_name, 'INFO', 'Proses penyimpanan batch simulasi selesai.', ['simulationName' => $simulationName]);
?>