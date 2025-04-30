<?php
// Pastikan session sudah dimulai dengan benar
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Jika user belum login atau bukan admin, redirect ke login
if (!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== 'admin') {
    header("Location: login.html");
    exit;
}

// Untuk meningkatkan keamanan, regenerasi session ID setiap kali halaman ini diakses
session_regenerate_id(true);
?>
