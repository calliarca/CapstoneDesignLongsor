<?php
session_start();
header('Content-Type: application/json');
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "simulator_longsor";

// Cek apakah user sudah login
if (!isset($_SESSION['user_id']) || !isset($_SESSION['account_type'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id']; // Ambil ID user dari sesi login
$account_type = $_SESSION['account_type']; // Ambil jenis akun (admin/user)

// Koneksi ke database
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Jika account_type adalah "admin", ambil semua history simulasi
if ($account_type === "admin") {
    $sql = "SELECT 
                s1.id,
                s1.simulation_name AS nama_simulasi,
                s1.created_at,
                (SELECT MIN(s2.created_at) 
                 FROM simulations s2 
                 WHERE s2.simulation_name = s1.simulation_name) AS start_time,
                (SELECT MAX(s3.created_at) 
                 FROM simulations s3 
                 WHERE s3.simulation_name = s1.simulation_name) AS end_time
            FROM simulations s1
            WHERE s1.created_at = (
                SELECT MAX(s4.created_at) 
                FROM simulations s4 
                WHERE s4.simulation_name = s1.simulation_name
            )
            ORDER BY s1.created_at DESC";
} else {
    // Jika user bukan admin, hanya ambil simulasi yang sudah didaftarkan ke user tersebut
    $sql = "SELECT 
                s1.id,
                s1.simulation_name AS nama_simulasi,
                s1.created_at,
                (SELECT MIN(s2.created_at) 
                 FROM simulations s2 
                 WHERE s2.simulation_name = s1.simulation_name) AS start_time,
                (SELECT MAX(s3.created_at) 
                 FROM simulations s3 
                 WHERE s3.simulation_name = s1.simulation_name) AS end_time
            FROM simulations s1
            JOIN user_simulation_access usa ON usa.simulation_id = s1.id
            WHERE usa.user_id = ?
            AND s1.created_at = (
                SELECT MAX(s4.created_at) 
                FROM simulations s4 
                WHERE s4.simulation_name = s1.simulation_name
            )
            ORDER BY s1.created_at DESC";
}

$stmt = $conn->prepare($sql);

// Jika user biasa, binding parameter user_id
if ($account_type !== "admin") {
    $stmt->bind_param("i", $user_id);
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $start_time = strtotime($row['start_time']);
        $end_time = strtotime($row['end_time']);
        $duration = $end_time - $start_time; // Selisih waktu dalam detik

        // Konversi durasi ke format H:M:S
        $waktu_simulasi = gmdate("H:i:s", $duration);

        $data[] = [
            'id' => $row['id'],
            'nama_simulasi' => $row['nama_simulasi'],
            'tanggal' => date("Y-m-d", strtotime($row['created_at'])),
            'timestamp' => date("H:i:s", strtotime($row['created_at'])),
            'waktu_simulasi' => $waktu_simulasi
        ];
    }
}

// Jika tidak ada data, kirimkan response kosong
if (empty($data)) {
    echo json_encode(["status" => "success", "message" => "No simulations found", "data" => []]);
} else {
    echo json_encode(["status" => "success", "data" => $data], JSON_PRETTY_PRINT);
}

$stmt->close();
$conn->close();
?>
