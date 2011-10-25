<?php
// Web service created for the Phinishing Phishing project.
// request should be of the form:
//   query-entities.php?q=URL%20encoded_query_string
//
// Author: Lucas Maystre <lucas@maystre.ch>
// Date: 2010-10-20

// Define the output.
header('Content-Type: text/xml, charset="utf-8"');

// Load the settings.
require_once 'lib/config.inc.php';
require_once 'lib/log.inc.php';

$db = pg_connect(DB_CONNECTION_STRING);

// Log the request.
$headers = apache_request_headers();
$pp_id = isset($headers['X-Phinishphish-Cid'])
    ? $headers['X-Phinishphish-Cid']
    : -1;
log_request($db, $pp_id, $_GET['q']);

// If there was no query parameter, we just return no result.
if (!isset($_GET['q']) || empty($_GET['q'])) {
  die('<entities matches="0" />');
}

$query = urldecode($_GET['q']);
// Remove things like www. (common 'mistake').
$query = preg_replace('/[wW]{2,}\./', '', $query);

$entities = find_entities($query, $db);
generate_xml($entities);

// Queries the database for entities which match the query, and returns them
// (with their associated domains) in an array.
function find_entities($query, $db) {
  // Entities are found in 4 different ways:
  // 1) exact match on domain names
  // 2) exact match on domain name soundex
  // 3) exact match on entity's long or short name soundex
  // 4) substring match on entity's normalized long or short name
  $ids = array();
  $entities = array();

  // Decode, trim, lowercase and sanitize the query parameter.
  $q = pg_escape_string(strtolower(trim(urldecode($query))));
  $q_nrm = preg_replace('/[^a-z]/', '', $q);
  $q_sdx = soundex($q);
  // echo "soundex: $q_sdx\n";

  // Exact matches on domain names.
  $res = pg_query($db, "SELECT DISTINCT entity FROM domain WHERE name = '$q'"
      ." LIMIT ".MAX_RESULTS) or die(pg_last_error($db));
  while ($row = pg_fetch_assoc($res)) {
    $ids[] = $row['entity'];
    // echo "exact match on domain name\n";
  }

  // Exact matches on domain name soundex.
  $res = pg_query($db, "SELECT DISTINCT entity FROM domain WHERE name_sdx = '$q_sdx'"
      ." LIMIT ".MAX_RESULTS) or die(pg_last_error($db));
  while ($row = pg_fetch_assoc($res)) {
    $ids[] = $row['entity'];
    // echo "exact match on domain name soundex\n";
  }

  // Exact match on long or short name soundex.
  $res = pg_query($db, "SELECT id FROM entity"
      ." WHERE lname_sdx = '$q_sdx' OR sname_sdx = '$q_sdx'"
      ." LIMIT ".MAX_RESULTS) or die(pg_last_error($db));
  while ($row = pg_fetch_assoc($res)) {
    $ids[] = $row['id'];
    // echo "exact match on long or short name soundex\n";
  }

  // Substring match on normalized long or short name.
  $res = pg_query($db, "SELECT id FROM entity"
      ." WHERE lname_nrm ILIKE '%$q_nrm%' OR sname_nrm ILIKE '%$q_nrm%'"
      ." LIMIT ".MAX_RESULTS) or die(pg_last_error($db));
  while ($row = pg_fetch_assoc($res)) {
    $ids[] = $row['id'];
    // echo "substring match on normalized long or short name\n";
  }

  // If we haven't found anything, there's no need to go further.
  if (count($ids) == 0) {
    return array();
  }

  // As we did several queries, we might have more than MAX_RESULTS results.
  $ids = array_slice($ids, 0, MAX_RESULTS);

  // Aggregate all the entities and their domains.
  $ids = array_unique($ids); // Filter out the duplicates.
  $res_entity = pg_query($db, "SELECT id, lname, sname, image_url, is_provider "
      ."FROM entity WHERE id IN (".join(',', $ids).")") or die(pg_last_error($db));
  while ($entity = pg_fetch_assoc($res_entity)) {
    $entity['domains'] = array();
    $res_domain = pg_query($db, "SELECT id, name, is_primary, entity "
        ."FROM domain WHERE entity = ".$entity['id']) or die(pg_last_error($db));
    while ($domain = pg_fetch_assoc($res_domain)) {
      $entity['domains'][] = $domain;
    }
    $entities[] = $entity;
  }
  return $entities;
}

// Generates an XML tree from an array of entities, found via find_entities,
// and outputs it to the user.
function generate_xml($entities) {
  $writer = new XMLWriter();
  $writer->openURI('php://output');
  $writer->startDocument('1.0', 'utf-8');

  $writer->startElement('entities');
  foreach ($entities as $entity) {
    $writer->startElement('entity');
    $writer->writeAttribute('id', $entity['id']);
    $writer->writeElement('provider', $entity['is_provider']);
    $writer->writeElement('lname', $entity['lname']);
    if ($entity['sname']) {
      $writer->writeElement('sname', $entity['sname']);
    }
    if ($entity['image_url']) {
      $writer->writeElement('image', $entity['image_url']);
    }
    $writer->startElement('domains');
    foreach($entity['domains'] as $domain) {
      $writer->startElement('domain');
      $writer->writeAttribute('id', $domain['id']);
      $writer->writeAttribute('primary', $domain['is_primary']);
      $writer->text($domain['name']);
      $writer->endElement(); // domain
    }
    $writer->endElement(); // domains
    $writer->endElement(); // entity
  }
  $writer->endElement(); // entities

  // Print it.
  $writer->flush();
}

?>
