<?php

function log_request($db, $pp_id, $q) {
  if (!isset($pp_id) || is_null($pp_id)) {
    $pp_id = 0;
  }
  $pp_id = pg_escape_string(strtolower(trim($pp_id)));
  if (!isset($q) || is_null($q)) {
    $q = '';
  }
  $q = pg_escape_string(strtolower(trim($q)));

  pg_query($db, "INSERT INTO request (client_id, query) VALUES ($pp_id, '$q')");
}

?>
