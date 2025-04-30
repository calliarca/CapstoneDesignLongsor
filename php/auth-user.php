<?php
// Pastikan session sudah dimulai dengan benar
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Jika user belum login atau bukan user biasa, redirect ke login
if (!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== 'user') {
    header("Location: login.html");
    exit;
}

// Regenerasi session ID untuk keamanan
session_regenerate_id(true);
?>
