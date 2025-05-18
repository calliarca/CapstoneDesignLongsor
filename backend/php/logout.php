<?php
session_start();
$_SESSION = [];  // Hapus semua data di session
session_unset(); // Hapus variabel session
session_destroy(); // Hancurkan session

// Hapus cookie session jika ada
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, 
        $params["path"], $params["domain"], 
        $params["secure"], $params["httponly"]
    );
}

header('Content-Type: application/json');
echo json_encode(["status" => "success", "message" => "Session dihapus"]);
exit();
?>
