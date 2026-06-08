<?php
// =============================================
// ZIGO VIP SERVER - Database Connection
// Change these values to match your hosting DB
// =============================================

$servername = "localhost";
$username   = "YOUR_DB_USERNAME";
$password   = "YOUR_DB_PASSWORD";
$dbname     = "YOUR_DB_NAME";

$conn = mysqli_connect($servername, $username, $password, $dbname);

if (!$conn) {
    die("Connection Error: " . mysqli_connect_error());
}
?>
