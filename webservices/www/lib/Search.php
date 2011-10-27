<?php

/**
 * Assumptions:
 * - call to the API can be done using a GET request
 * - API returns JSON
 */
abstract class Search {

  /** Request parameters */
  private $params = array();

  /**
   * Returns the URL used to perform the GET request to the API. Often, this
   * will be constructed using the output of getQueryString, below.
   */
  abstract protected function getURL();

  /**
   * Processes the received JSON and returns a string containing the XML ready
   * to be sent back.
   */
  abstract protected function jsonToXml($json);

  protected function setParam($key, $value) {
    $this->params[$key] = $value;
    return $this;
  }

  protected function getQueryString() {
    $list = array();
    foreach ($this->params as $key => $val) {
      $list[] = rawurlencode($key).'='.rawurlencode($val);
    }
    return implode('&', $list);
  }

  /**
   * Sets the search query.
   */
  public function setQuery($query) {
    return $this->setParam('q', $query);
  }

  /**
   * Executes the search request, and returns an XML string that is ready to be
   * sent back to the client.
   */
  public final function execute() {
    $json = file_get_contents($this->getURL());
    return $this->jsonToXml(json_decode($json, true));
  }

  /**
   * Returns the first and second level domain for any URL.
   * E.g.: https://foo.bar.com/?bla=baz -> bar.com
   */
  static protected function urlToDomain($url) {
    $fqdn = parse_url($url, PHP_URL_HOST);
    $names = explode('.', $fqdn);
    $tld = array_pop($names);
    $sld = array_pop($names);
    return $sld . '.' . $tld;
  }
}
