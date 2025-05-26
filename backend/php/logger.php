<?php
if (!function_exists('write_log')) {
    function write_log($script_name, $level, $message, $data = null) {
        $log_file = __DIR__ . '/simulation_validation.log'; // Pastikan path ini writable oleh server
        // Pertimbangkan untuk mengatur zona waktu default di awal skrip utama atau di php.ini
        // date_default_timezone_set('Asia/Jakarta');
        $timestamp = date('Y-m-d H:i:s T'); // Tambahkan T untuk zona waktu

        $log_entry = "[$timestamp][$script_name][$level]: $message";
        if ($data !== null) {
            $log_entry .= " | Data: " . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        $log_entry .= PHP_EOL;
        try {
            file_put_contents($log_file, $log_entry, FILE_APPEND);
        } catch (Exception $e) {
            // Fallback jika logging ke file gagal
            error_log("GAGAL MENULIS KE LOG (" . $log_file . "): " . $e->getMessage() . " | Pesan Asli: " . $log_entry);
        }
    }
}
?>