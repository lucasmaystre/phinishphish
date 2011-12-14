Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://phinishphish/globals.js");

// Serves as global namespace for the extension.
// The condition prevents resetting if included multiple times.
if ('undefined' == typeof(phinishphish)) { 
  var phinishphish = {};
}

/**
 * Helper function to bind methods to their instance, used when passing
 * callbacks for events.
 * Adapted from the Google closure JS library (goog.bind).
 */
phinishphish.bind = function(obj, method, args) {
  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return method.apply(obj, newArgs);
    };
  } else {
    return function() { return method.apply(obj, arguments); };
  }
};

/** Convenience logger. */
phinishphish.log = function(str) {
  //return; // Disable logging; TODO
  var consoleService = Cc["@mozilla.org/consoleservice;1"]
     .getService(Ci.nsIConsoleService);
  consoleService.logStringMessage(str);
};

/** Returns the value of a GET parameter given a URL, or null. */
phinishphish.param = function(url, param) {
  // Assert that the URL has a query string.
  var startQuery = url.indexOf('?');
  if (startQuery < 0) return null;

  // Assert that the query string is not empty.
  var query = url.substring(startQuery + 1);
  if (query.length <= 0) return null;

  param = param + '=';
  var begin = query.indexOf(param);
  if (begin > -1) {
    begin += param.length;
    var end = query.indexOf('&', begin);
    if (end == -1) {
      end = query.length;
    }
    return decodeURI(query.substring(begin, end));
  }
  return null; // Parameter was not found.
};

/**
 * Returns the highest level domain that can be publicly registered from a given
 * hostname. In case we it cannot be found for some reason, we (conservatively)
 * return the hostname.
 */
phinishphish.extractDomain = function(hostname) {
  var suffix = PPModules.domainExtractor.extract(hostname);
  return suffix === null ? hostname : suffix;
};

/** Simple wrapper around the tracing function provided by the module. */
phinishphish.trace = function(event, data) {
  PPModules.trace(event, data);
  phinishphish.log('traced event "' + event + '" with data "' + data + '"');
};
