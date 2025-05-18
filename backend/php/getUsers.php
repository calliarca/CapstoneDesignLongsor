<?php
header('Content-Type: application/json');
include_once 'config.php';

$query = "SELECT name, email FROM users WHERE account_type = 'user'";
$result = $conn->query($query);

$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode($users);
?>
