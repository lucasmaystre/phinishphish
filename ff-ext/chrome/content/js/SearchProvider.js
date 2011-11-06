Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://phinishphish/globals.js");

/**
 * A cached interface to the Search API. The main functionality is provided by
 * the 'search' method.
 *
 * Author: Lucas Maystre <lucas@maystre.ch>
 */
phinishphish.SearchProvider = function() {
  this.cache = PPModules.searchCache;
}

/** Search result data structure */
phinishphish.SearchResult = function() {
  this.rank = 0;
  this.title = null;
  this.link = null;
  this.domain = null;
};

/** The URL prefix for the API calls. */
phinishphish.SearchProvider.URL_PREFIX =
    "http://ku.lum.li/domains/";

/** The maximal number of elements in the cache. */
phinishphish.SearchProvider.CACHE_SIZE = 100;

/** The TTL for cache items. */
phinishphish.SearchProvider.CACHE_TTL = 3600; // 1 hour.

/** Small helper function to compute when a new cache entry expires. */
phinishphish.SearchProvider.exp = function() {
  // In milliseconds since UNIX epoch.
  var expiration = (new Date()).getTime()
      + phinishphish.SearchProvider.CACHE_TTL * 1000;
  return new Date(expiration);
};

/**
 * Performs a search for the query string using an asynchronous request.
 * Therefore it is possible to register a callback function.
 */
phinishphish.SearchProvider.prototype.search = function(query, callback) {
  // First, lookup the cache to see if we can speed things up.
  if (this.cache.getItem(query) != null) {
    if (callback) {
      callback.call(null, this.cache.getItem(query));
      return;
    }
  }

  var url = phinishphish.SearchProvider.URL_PREFIX + encodeURI(query);
  var req = new XMLHttpRequest();
  req.open('GET', url, true); // Asynchronous request.

  req.onreadystatechange = phinishphish.bind(this,
      function() {
        if (req.readyState == 4) { // COMPLETED
          var results = false;
          if (req.status == 200) {
            results = this.parse(req.responseXML);
            // Cache the result for later access.
            this.cache.setItem(query, results,
                {'expirationAbsolute': phinishphish.SearchProvider.exp()});
          }
          if (callback) {
            callback.call(null, results);
            return;
          }
        }
      });

  req.send(null);
};

/**
 * Transforms a Search API XML response to an array of SearchResult objects.
 */
phinishphish.SearchProvider.prototype.parse = function(dom) {
  var results = new Array();

  // Iterate over the results;
  var nodes = dom.getElementsByTagName('result');
  for (var i = 0; i < nodes.length; ++i) {
    var result = new phinishphish.SearchResult();
    if (nodes[i].hasAttribute('rank')) {
      result.rank = nodes[i].getAttribute('rank');
    }
    if (nodes[i].getElementsByTagName('title').length > 0) {
      result.title = nodes[i].getElementsByTagName('title')[0].textContent;
    }
    if (nodes[i].getElementsByTagName('link').length > 0) {
      result.link = nodes[i].getElementsByTagName('link')[0].textContent;
    }
    if (nodes[i].getElementsByTagName('domain').length > 0) {
      result.domain = nodes[i].getElementsByTagName('domain')[0].textContent;
    }
    results.push(result);
  }
  return results;
};
