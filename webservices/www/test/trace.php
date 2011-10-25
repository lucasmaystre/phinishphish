<?php

$h = apache_request_headers();
$cid = isset($h['X-Phinishphish-Cid']) ? $h['X-Phinishphish-Cid'] : '';
$event = isset($_GET['event']) ? $_GET['event'] : '';
$data = isset($_GET['data']) ? $_GET['data'] : '';

$line = "[cid='$cid', event='$event', data='$data']\n";
$file = fopen('log.txt', 'a');
fwrite($file, $line);
fclose($file);

echo 'OK';
?>
