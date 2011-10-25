<?php
/**
 * Would be interesting to log:
 * - query
 * - nb of results
 * - time it took
 */

require_once 'lib/GoogleSearch.php';
require_once 'lib/helpers.inc.php';

function domain($url) {
  $fqdn = parse_url($url, PHP_URL_HOST);
  $names = explode('.', $fqdn);
  $tld = array_pop($names);
  $sld = array_pop($names);
  return $sld . '.' . $tld;
}

function generate_xml($results) {
  $writer = new XMLWriter();
  $writer->openURI('php://output');
  $writer->startDocument('1.0', 'utf-8');

  $writer->startElement('results');
  if (isset($results['queries']['request'][0]['totalResults'])) {
    $writer->writeAttribute('count',
        $results['queries']['request'][0]['totalResults']);
  }

  if (isset($results['items']) && is_array($results['items'])) {
    foreach ($results['items'] as $rank => $item) {
      $writer->startElement('result');
      $writer->writeAttribute('rank', $rank + 1);

      // Elements of a result.
      $writer->writeElement('title', $item['title']);
      $writer->writeElement('link', $item['link']);
      $writer->writeElement('domain', domain($item['link']));
      $writer->endElement(); // result
    }
  }
  $writer->endElement(); // results

  // Print it.
  $writer->flush();
}

$results = id(new GoogleSearch())
    ->setQuery($_GET['q'])
    ->execute();

// For debugging.
// header('Content-Type: text/plain');
// var_dump($results);
// exit(0);

header('Content-Type: text/xml, charset="utf-8"');
generate_xml($results);
