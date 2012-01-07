var EXPORTED_SYMBOLS = [];  
const Cc = Components.classes;  
const Ci = Components.interfaces; 

// Import namespace declaration and classes.
Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://phinishphish/Cache.js");
Components.utils.import("resource://phinishphish/DomainExtractor.js");
Components.utils.import("resource://phinishphish/ActivityLogger.js");

// The two caches used as singleton across the browser.
PPModules.searchCache = new PPModules.Cache(100); // cache size of 100.
PPModules.trustCache = new PPModules.Cache(100); // cache size of 100.

// The domain extractor, as a singleton because it's expensive to instantiate.
PPModules.domainExtractor = new PPModules.DomainExtractor();

// The activity logger, as a singleton to avoid duplicating DB connections.
PPModules.activityLogger = new PPModules.ActivityLogger();

PPModules.cid = /*BEGIN_CID*/-1/*END_CID*/;

// Function used to log actions to the server. We can't use XMLHttpRequest here.
PPModules.trace = function(event, data) {
  return; // Tracing is disabled.
  var urlStr = 'http://ka.lum.li/trace/'
      + '?event=' + encodeURI(event)
      + '&data=' + encodeURI(data);

  var ioService = Components.classes["@mozilla.org/network/io-service;1"]  
      .getService(Components.interfaces.nsIIOService);  
                                  
  var url = ioService.newURI(urlStr, null, null);  
  var channel = ioService.newChannelFromURI(url)
      .QueryInterface(Ci.nsIHttpChannel);
                                      
  // Stub implementation of nsIStreamListener
  var listener = {
    onDataAvailable: function() {},
    onStartRequest: function() {},
    onStopRequest: function() {}
  }
  channel.asyncOpen(listener, null);  
}

var observer = {
  observe: function(subject, topic, data) {
    if (topic == 'http-on-modify-request') {
      subject.QueryInterface(Ci.nsIHttpChannel);
      var host = subject.URI.host;
      if (host == 'ku.lum.li' || host == 'ka.lum.li') {
        subject.setRequestHeader('X-Phinishphish-Cid', PPModules.cid, false);
      }
    } else if (topic == 'http-on-examine-response') {
      subject.QueryInterface(Ci.nsIHttpChannel);
      try {
        var data = subject.getResponseHeader('X-Phinishphish-Pingback');
        PPModules.trace('pingback', data);
      } catch(err) {}
    }
  }
}

var obsService = Cc["@mozilla.org/observer-service;1"]
    .getService(Ci.nsIObserverService);
obsService.addObserver(observer, "http-on-modify-request", false);
obsService.addObserver(observer, "http-on-examine-response", false);
