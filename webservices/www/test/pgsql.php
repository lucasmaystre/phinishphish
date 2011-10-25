<?php
header("Content-Type: text/plain");

$db = pg_connect("host=localhost dbname=phishing user=root password=jiadwizcuiby");

$res = pg_query($db, "SELECT id, lname, sname, image_url FROM entity");

while ($row = pg_fetch_assoc($res)) {
  echo $row['id'].' - '.$row['lname']."\n";
}

pg_close($db);

?>
