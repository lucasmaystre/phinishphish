<?php
require_once 'Search.php';

class GoogleSearch extends Search {
  public static $DEFAULT_FIELDS =
      'items(title,link,displayLink),queries(request)';

  private static $API_KEY = 'AIzaSyD7XEU_zyUNUSAbMIKiTzHvGOiyaVBujLM';
  private static $CSE_ID = '002908917518209071168:pili1ryr1zw';
  private static $URL_BASE = 'https://www.googleapis.com/customsearch/v1';

  public function __construct() {
    $this->setParam('key', self::$API_KEY);
    $this->setParam('cx', self::$CSE_ID);
    $this->setParam('fields', self::$DEFAULT_FIELDS);
  }

  public function setFields($fields) {
    return $this->setParam('fields', $fields);
  }
  
  protected function getURL() {
    return self::$URL_BASE . '?' . $this->getQueryString();
  }

  protected function jsonToXml($json) {
    $writer = new XMLWriter();
    $writer->openMemory();
    $writer->startDocument('1.0', 'utf-8');

    $writer->startElement('results');
    if (isset($json['queries']['request'][0]['totalResults'])) {
      $writer->writeAttribute('count',
          $json['queries']['request'][0]['totalResults']);
    }

    if (isset($json['items']) && is_array($json['items'])) {
      foreach ($json['items'] as $rank => $item) {
        $writer->startElement('result');
        $writer->writeAttribute('rank', $rank + 1);

        // Elements of a result.
        $writer->writeElement('title', $item['title']);
        $writer->writeElement('link', $item['link']);
        $writer->writeElement('domain', self::urlToDomain($item['link']));
        $writer->endElement(); // result
      }
    }
    $writer->endElement(); // results

    return $writer->outputMemory(true);
  }
}
