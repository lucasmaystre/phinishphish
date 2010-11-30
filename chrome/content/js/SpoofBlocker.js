/**
 * Main controller for the Phinishing Phishing extension. This class listens to
 * the requests, triggers the resolution mechanism when user input information
 * is sent to an untrusted website, and decides wheter to allow or deny the
 * request based on the outcome of the resolution.
 *
 * Author: Lucas Maystre <lucas@maystre.ch>
 */
phinishphish.SpoofBlocker = function() {
  this.entityProv = new phinishphish.EntityProvider();
  this.trustProv = new phinishphish.TrustProvider();
  this.reqObserver = null;

  // Set storing the windows which contain user input.
  this.dirtyWindows = new phinishphish.Set();

  // Map storing the hostnames for which resolution is pending.
  this.pending = {};
};

/**
 * Starts the anti-phishing mechanism.
 */
phinishphish.SpoofBlocker.prototype.run = function() {
  var that = this;
  var resolutionObserver = {
      observe : function(subject, topic, data) {
          if (topic == "phinishphish-resolution-complete") {
            that.receiveMessage(data);
          }
      }};
  // TODO: deregister at some point? same for reqobserver
  var obsService = Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
  obsService.addObserver(
      resolutionObserver, 'phinishphish-resolution-complete',false);

  // Listens to click on the status bar.
  document.getElementById('phinishphish-sbp').addEventListener('click',
      phinishphish.bind(this, this.resolve), false);
  // TODO Start to listen to requests.
  this.reqObserver = new phinishphish.ReqObserver(
      phinishphish.bind(this, this.handleRequest));

  // Listen to load events to add listeners to input fields
  gBrowser.addEventListener('load',
      phinishphish.bind(this, this.handlePageLoad), true); // we want to bubble
                                                           // the event further.
  gBrowser.addEventListener('unload',
      phinishphish.bind(this, this.handlePageUnload), true); // we want to bubble
                                                             // the event
                                                             // further.
};

phinishphish.SpoofBlocker.prototype.handlePageUnload = function(event) {
  var win = event.originalTarget.defaultView;
  this.dirtyWindows.remove(win);
}

// TODO how does our extension deal with frames ?
phinishphish.SpoofBlocker.prototype.handlePageLoad = function(event) {
  // Listen to any user text input.
  var doc = event.originalTarget;
  if (doc instanceof HTMLDocument) {
    var inputs = doc.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; ++i) {
      inputs[i].addEventListener('input',
          phinishphish.bind(this, this.handleInput), true);
    }
    var textareas = doc.getElementsByTagName('textarea');
    for (var i = 0; i < textareas.length; ++i) {
      textareas[i].addEventListener('input',
          phinishphish.bind(this, this.handleInput), true);
    }

    // Lookup trust and associated entities to cache them.
    try {
      this.trustProv.lookup(doc.defaultView.location.hostname);
      this.entityProv.lookup(doc.defaultView.location.hostname);
    } catch(err) {
      // An exception can be thrown when there is no hostname (e.g. a blank
      // page).
      phinishphish.log('Could not intialize cache: ' + err.description);
    }
  }
};

phinishphish.SpoofBlocker.prototype.handleInput = function(event) {
  var win = event.originalTarget.ownerDocument.defaultView;
  this.dirtyWindows.add(win);
};

// var winwin = domWin.top.document.defaultView; // seems to be the same than
// browsWin at least for .document
// var brows = gBrowser.getBrowserForDocument(domWin.top.document);
// var browsWin = brows.contentWindow;
//winwin.alert('youplala');
//if (gBrowser.getBrowserForDocument(domWin.document) ==
//gBrowser.getBrowserForDocument(content.document)) {
phinishphish.SpoofBlocker.prototype.handleRequest = function(httpChannel) {
  // Extract the window form which originated the request. We follow a default
  // allow policy: if we can't find a window, we allow the request.
  var notificationCallbacks = httpChannel.notificationCallbacks
      ? httpChannel.notificationCallbacks
      : httpChannel.loadGroup.notificationCallbacks;
  if (!notificationCallbacks) {
    phinishphish.log('no notificationCallbacks');
    return;
  }
  try {
    var domWin = notificationCallbacks.getInterface(Ci.nsIDOMWindow);
  } catch(err) {
    phinishphish.log('could not tie request with window');
    return;
  }

  // We go on only if the request comes from a window we were watching.
  if (this.dirtyWindows.contains(domWin)) {
    var hostname = httpChannel.URI.host;

    // Check if a resolution is already pending for this hostname.
    if (this.pending[hostname] !== undefined) {
      httpChannel.cancel(Components.results.NS_BINDING_ABORTED);
      return;
    }

    // Synchronous trust lookup, and resolution if not trusted.
    var isTrusted = this.trustProv.lookup(hostname, null, true);
    if (!isTrusted) {
      // Focus on this browser, and select the tab from which the request came.
      window.focus();
      var tabIndex = gBrowser.getBrowserIndexForDocument(domWin.top.document);
      gBrowser.selectedTab = gBrowser.tabContainer.childNodes[tabIndex]; 
      
      var overlay = phinishphish.SpoofBlocker.drawOverlay(domWin.document);

      var isAllowed = this.resolve(hostname);
      if (!isAllowed) {
        httpChannel.cancel(Components.results.NS_BINDING_ABORTED);
      } else { // Resolution has suceeded.
        overlay.parentNode.removeChild(overlay);
        this.showPopup(3000);
      }
    }
    this.dirtyWindows.remove(domWin);
  }
};

phinishphish.SpoofBlocker.prototype.showPopup = function(duration) {
  document.getElementById('phinishphish-notice')
      .openPopup(document.getElementById('phinishphish-sbp'), 'before_end');
  setTimeout(phinishphish.bind(document.getElementById('phinishphish-notice'),
      document.getElementById('phinishphish-notice').hidePopup), duration);
}

phinishphish.SpoofBlocker.drawOverlay = function(doc) {
  if (!(doc instanceof HTMLDocument)) {
    phinishphish.log('called drawOverlay on a non-HTML document.');
    return null;
  }

  var body = doc.getElementsByTagName('body')[0];
  var overlay = doc.createElement('div');
  overlay.setAttribute('style', 'position:fixed;'
      + ' top: 0;'
      + ' left: 0;'
      + ' width: 100%;'
      + ' height: 100%;'
      + ' background-color: #000000;'
      + ' opacity: 0.5;'
      + ' z-index: 10000 !important');
  body.appendChild(overlay);
  return overlay;
};

/**
 * Triggers the resolution mechanism, and returns a boolean indicating if the
 * request is allowed or not, based on the user's intention.
 */
phinishphish.SpoofBlocker.prototype.resolve = function(hostname) {
  // Mark the current hostname as pending resolution.
  this.pending[hostname] = null;

  // Open the resolution window. The 'modal' option makes the call blocking.
  while (typeof(this.pending[hostname]) != 'boolean') {
    var url = 'chrome://phinishphish/content/resolver.xul?target='
        + encodeURI(hostname);
    var options = 'chrome,modal,centerscreen,width=550,height=330'; //close=no
    window.open(url, 'resolve', options);
  }

  var isAllowed = this.pending[hostname];
  delete this.pending[hostname]; // Not pending anymore.
  return isAllowed;
};

phinishphish.SpoofBlocker.prototype.receiveMessage = function(data) {
  phinishphish.log('received message: ' + data);
  var separator = data.indexOf('|');
  var hostname = decodeURI(data.substring(0, separator));
  var allow = decodeURI(data.substring(separator + 1));

  if (this.pending[hostname] !== undefined) {
    this.pending[hostname] = (allow == 'true');
  }
};
