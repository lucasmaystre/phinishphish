<?php
/**
 * Would be interesting to log:
 * - query
 * - nb of results
 * - time it took
 */

require_once 'lib/helpers.inc.php';
require_once 'lib/Search.php';
require_once 'lib/GoogleSearch.php';
require_once 'lib/BingSearch.php';

// $search = new GoogleSearch();
$search = new BingSearch();

header('Content-Type: text/xml, charset="utf-8"');
// TODO Handle the case where the param 'q' is missing.
echo $search->setQuery($_GET['q'])->execute();
