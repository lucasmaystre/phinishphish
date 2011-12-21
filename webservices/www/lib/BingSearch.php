<?php
require_once 'Search.php';

class BingSearch extends Search {
  private static $APPID = "BACBD0199CC4139DC48AA8567AE0AB0C33DBFEF6";
  private static $URL_BASE = "http://api.search.live.net/json.aspx";

  public function __construct() {
    $this->setParam('AppID', self::$APPID);
    $this->setParam('Sources', "Web");
    $this->setParam('Market', 'en-US'); // Google (lol) for SearchRequest.Market
  }

  public function setCount($nb) {
    return $this->setParam("Web.Count", $nb);
  }

  public function setQuery($query) {
    return $this->setParam('Query', $query);
  }

  protected function getURL() {
    return self::$URL_BASE . '?' . $this->getQueryString();
  }
  
  protected function jsonToXml($json) {
    $writer = new XMLWriter();
    $writer->openMemory();
    $writer->startDocument('1.0', 'utf-8');

    $writer->startElement('results');
    if (isset($json['SearchResponse']['Web']['Total'])) {
      $writer->writeAttribute('count', $json['SearchResponse']['Web']['Total']);
    }

    if (isset($json['SearchResponse']['Web']['Results'])
        && is_array($json['SearchResponse']['Web']['Results'])) {
      foreach ($json['SearchResponse']['Web']['Results'] as $rank => $item) {
        $writer->startElement('result');
        $writer->writeAttribute('rank', $rank + 1);

        // Elements of a result.
        $writer->writeElement('title', $item['Title']);
        $writer->writeElement('link', $item['Url']);
        $writer->writeElement('domain', self::urlToDomain($item['Url']));
        $writer->endElement(); // result
      }
    }
    $writer->endElement(); // results

    return $writer->outputMemory(true);
  }
}
