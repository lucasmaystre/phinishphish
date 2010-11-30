Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://phinishphish/globals.js");

/**
 * A cached interface to the Web of Trust reputation API. The main functionality
 * is provided by the 'lookup' method.
 *
 * Author: Lucas Maystre <lucas@maystre.ch>
 */
phinishphish.TrustProvider = function() {
  this.cache = PPModules.trustCache;
}

/** The URL prefix for WoT API calls. */
phinishphish.TrustProvider.URL_PREFIX =
    "https://api.mywot.com/0.4/public_query2?target=";

/** The maximal number of elements in the cache. */
phinishphish.TrustProvider.CACHE_SIZE = 100;

/** The TTL for cache items. */
phinishphish.TrustProvider.CACHE_TTL = 3600; // 1 hour.

/** Small helper function to compute when a new cache entry expires. */
phinishphish.TrustProvider.exp = function() {
  // In milliseconds since UNIX epoch.
  var expiration = (new Date()).getTime()
      + phinishphish.TrustProvider.CACHE_TTL * 1000;
  return new Date(expiration);
};

/**
 * Looks up if a domain can be trusted, using the WoT API. This is done
 * using an asynchronous request, therefore it is possible to register
 * a callback function.
 */
phinishphish.TrustProvider.prototype.lookup = function(target, callback, sync) {
  phinishphish.log('call to lookup: target=' + target);
  // First, lookup the cache to see if we can speed things up.
  if (this.cache.getItem(target) != null) {
    if (sync) {
      return this.isTrusted(this.cache.getItem(target));
    } else {
      if (callback) {
        callback.call(null, this.isTrusted(this.cache.getItem(target)));
      }
    }
  }

  var url = phinishphish.TrustProvider.URL_PREFIX + target;
  var req = new XMLHttpRequest();
  if (sync) {
    req.open('GET', url, false); // Synchronous request.
  } else {
    req.open('GET', url, true); // Asynchronous request.
  }

  var processResponse = phinishphish.bind(this,
      function() {
        if (req.readyState == 4) { // COMPLETED
          var isTrusted = false;
          if (req.status == 200) {
            var trustLevels = this.parse(req.responseXML);
            if (trustLevels) {
              isTrusted = this.isTrusted(trustLevels);
            }
            // Cache the result for later access.
            this.cache.setItem(target, trustLevels,
                {'expirationAbsolute': phinishphish.TrustProvider.exp()});
          }
          if (sync) {
            return isTrusted;
          } else {
            if (callback) {
              callback.call(null, isTrusted);
            }
          }
        }
      });

  if (!sync) {
    req.onreadystatechange = processResponse;
  }
  req.send(null);

  // If the request is synchronous, by now the cache will be populated.
  if (sync) {
    return processResponse();
  }
};

/**
 * Takes an XML response from the WoT API and returns a hash
 * containing the reputation and the confidence for the trustworthiness
 * component. If they can't be found (or if one of them is 0), it returns
 * false.
 */
phinishphish.TrustProvider.prototype.parse = function(dom) {
  // The WOT API returns several reputation components. We are
  // interested in trustworhiness only (encoded as '0').
  var xpathResult = dom.evaluate(
      "/query/application[@name='0']", dom, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  var trustNode = xpathResult.singleNodeValue;

  if (trustNode) {
    var reputation = trustNode.getAttribute('r');
    var confidence = trustNode.getAttribute('c');
    if (reputation && confidence) {
      return {'rep': reputation, 'conf': confidence};
    }
  }
  return false; // Defaul case.
};

/**
 * Given reputation and confidence levels for trustworthiness, returns
 * whether the domain is ultimately trusted or not.
 */
phinishphish.TrustProvider.prototype.isTrusted = function(trustLevels) {
  var reputation = trustLevels['rep'];
  var confidence = trustLevels['conf'];
  phinishphish.log('rep: ' + reputation + ', conf:' + confidence);

  // According to WoT, the reputation is "unsatisfactory" below 60.
  // Therefore, this is our reputation threshold.
  // For the confidence level, we choose (arbitrarily) the threshold at
  // 2/5 , which corresponds to a confidence of at least 12.
  var isTrusted = (reputation >= 60) && (confidence >= 12);
  phinishphish.log('isTrusted? ' + isTrusted);
  return isTrusted;
};

phinishphish.trustProvider = new phinishphish.TrustProvider();
