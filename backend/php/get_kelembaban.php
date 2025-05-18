<?php
header('Content-Type: application/json');

// Koneksi database
$koneksi = new mysqli("localhost", "root", "", "simulator_longsor");

if ($koneksi->connect_error) {
  die(json_encode([
    'status' => 'error',
    'message' => 'Koneksi database gagal'
  ]));
}

// Query data terbaru
$sql = "SELECT 
          kelembaban_tanah_1 as sensor1,
          kelembaban_tanah_2 as sensor2,
          kelembaban_tanah_3 as sensor3,
          kelembaban_tanah_4 as sensor4,
          kelembaban_tanah_5 as sensor5,
          kelembaban_tanah_6 as sensor6,
          created_at
        FROM simulations 
        WHERE is_active = 1
        ORDER BY created_at DESC 
        LIMIT 1";

$result = $koneksi->query($sql);

if ($result && $row = $result->fetch_assoc()) {
  $response = [
    'status' => 'success',
    'sensors' => [
      'sensor1' => (float)$row['sensor1'],
      'sensor2' => (float)$row['sensor2'],
      'sensor3' => (float)$row['sensor3'],
      'sensor4' => (float)$row['sensor4'],
      'sensor5' => (float)$row['sensor5'],
      'sensor6' => (float)$row['sensor6']
    ],
    'timestamp' => $row['created_at']
  ];
  
  // Hitung rata-rata
  $values = array_values($response['sensors']);
  $response['average'] = round(array_sum($values) / count($values), 1);
} else {
  $response = [
    'status' => 'empty',
    'sensors' => array_fill_keys(['sensor1','sensor2','sensor3','sensor4','sensor5','sensor6'], 0),
    'average' => 0,
    'timestamp' => date('Y-m-d H:i:s')
  ];
}

echo json_encode($response);
$koneksi->close();
?>