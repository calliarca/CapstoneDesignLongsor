<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['name'])) {
    echo json_encode(["error" => "Name not set"]);
    exit;
}

echo json_encode(["name" => $_SESSION['name']]);
?>
