<?php

class GoogleSearch {
  public static $DEFAULT_FIELDS =
      'items(title,link,displayLink),queries(request)';

  private static $API_KEY = 'AIzaSyD7XEU_zyUNUSAbMIKiTzHvGOiyaVBujLM';
  private static $CSE_ID = '002908917518209071168:pili1ryr1zw';
  private static $URL_BASE = 'https://www.googleapis.com/customsearch/v1';

  private $params = array();

  public function __construct() {
    $this->params['key'] = self::$API_KEY;
    $this->params['cx'] = self::$CSE_ID;
    $this->params['fields'] = self::$DEFAULT_FIELDS;
  }

  private function getURL() {
    $list = array();
    foreach ($this->params as $key => $val) {
      $list[] = rawurlencode($key).'='.rawurlencode($val);
    }
    return self::$URL_BASE . '?' . implode('&', $list);
  }

  public function execute() {
    $json = file_get_contents($this->getURL());
    return json_decode($json, true);
  }

  public function setQuery($query) {
    $this->params['q'] = $query;
    return $this;
  }

  public function setFields($fields) {
    $this->params['fields'] = $fields;
    return $this;
  }
}
