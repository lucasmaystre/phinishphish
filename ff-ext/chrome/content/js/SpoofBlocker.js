/**
 * Main controller for the Phinishing Phishing extension. This class listens to
 * the requests, triggers the resolution mechanism when user input information
 * is sent to an untrusted website, and decides wheter to allow or deny the
 * request based on the outcome of the resolution.
 *
 * Author: Lucas Maystre <lucas@maystre.ch>
 */
phinishphish.SpoofBlocker = function() {
  this.searchProv = new phinishphish.SearchProvider();
  this.trustProv = new phinishphish.TrustProvider();
  this.reqObserver = null;
  this.resObserver = null;

  // Set storing the windows which contain user input.
  this.dirtyWindows = new phinishphish.Set();

  // Map storing the domains for which resolution is pending.
  this.pending = {};
};

/**
 * Starts the anti-phishing mechanism.
 */
phinishphish.SpoofBlocker.prototype.run = function() {
  // Trace the call.
  phinishphish.trace('load', window.navigator.userAgent);

  // TODO For testing purposes. Remove.
  // var testDomains = ["www.google.com", "google.com", "foo.bar.co.uk",
  //     "foo.bar.pvt.k12.ma.us", "hello.com.br", "blu.bla.bli.blo"];
  // for (var i = 0; i < testDomains.length; ++i) {
  //   phinishphish.log(phinishphish.extractDomain(testDomains[i]));
  // }

  // Listens to click on the status bar. TODO Remove.
  document.getElementById('phinishphish-sbp').addEventListener('click',
      phinishphish.bind(this, this.resolve, 'google.com'), false);

  // Start listening to requests.
  this.reqObserver = new phinishphish.ReqObserver(
      phinishphish.bind(this, this.handleRequest));
  //window.addEventListener('unload', // TODO Doesn't work.
  //    phinishphish.bind(this, this.reqObserver.unregister), true);

  // Listen to resolutions from the resolver.
  this.resObserver = new phinishphish.ResObserver(
      phinishphish.bind(this, this.receiveMessage));
  //window.addEventListener('unload', // TODO Doesn't work.
  //    phinishphish.bind(this, this.resObserver.unregister), true);

  // Listen to load events to add listeners to input fields
  // (last parameter bubbles the event further).
  gBrowser.addEventListener('load',
      phinishphish.bind(this, this.handlePageLoad), true);

  // (last parameter bubbles the event further).
  gBrowser.addEventListener('unload',
      phinishphish.bind(this, this.handlePageUnload), true);
};

phinishphish.SpoofBlocker.prototype.handlePageUnload = function(event) {
  var win = event.originalTarget.defaultView;
  this.dirtyWindows.remove(win);
};

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

  // Get the URL as a string.
  var url = httpChannel.URI.spec;

  // We go on only if the request comes from a window we were watching.
  if (this.dirtyWindows.contains(domWin)) {
    var domain = httpChannel.URI.host;

    // Check if a resolution is already pending for this domain.
    if (this.pending[domain] !== undefined) {
      httpChannel.cancel(Components.results.NS_BINDING_ABORTED);
      return;
    }

    // Synchronous trust lookup, and resolution if not trusted.
    var trustInfo = this.trustProv.lookup(domain, null, true);
    if (!trustInfo.isTrusted) {
      phinishphish.logRequest(
          {'url': url, 'has_input': true, 'is_suspect': true});
      if (!phinishphish.isResolved(domain)) {
        // Trigger the resolution only if it is the first time we encounter this
        // domain.
        // Focus on this browser, and select the tab from which the request came.
        window.focus();
        var tabIndex = gBrowser.getBrowserIndexForDocument(domWin.top.document);
        gBrowser.selectedTab = gBrowser.tabContainer.childNodes[tabIndex]; 
        var overlay = phinishphish.SpoofBlocker.drawOverlay(domWin.document);

        var outcome = this.resolve(domain);
        if (/*!outcome.isAllowed*/ true) {
          // Don't do anything special... We're just logging.
          overlay.parentNode.removeChild(overlay);
          phinishphish.logResolution({
              'hostname'  : outcome.domain,
              'keyword'   : outcome.query,
              'is_allowed': outcome.isAllowed,
              'reputation': trustInfo.rep,
              'confidence': trustInfo.conf,
              'search_res': outcome.rawResult
            });
          // httpChannel.cancel(Components.results.NS_BINDING_ABORTED);
          // this.handleDenial(domWin, outcome.query);
        } //else { // Resolution has suceeded.
          //overlay.parentNode.removeChild(overlay);
        //}
      }
    } else {
      phinishphish.logRequest(
          {'url': url, 'has_input': true, 'is_suspect': false});
    }

    this.dirtyWindows.remove(domWin);
  } else {
    phinishphish.logRequest(
        {'url': url, 'has_input': false, 'is_suspect': false});
  }
};

phinishphish.SpoofBlocker.prototype.handleDenial = function(win, query) {
  var redirect = 'chrome://phinishphish/content/deny.htm'
      + '?query=' + encodeURI(query)
  win.location = redirect;
};

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
phinishphish.SpoofBlocker.prototype.resolve = function(domain) {
  // Mark the current domain as pending resolution.
  this.pending[domain] = null;

  // Open the resolution window. The 'modal' option makes the call blocking.
  //while (this.pending[domain] == null) {
    var url = 'chrome://phinishphish/content/resolver.xul?target='
        + encodeURI(domain);
    var options = 'chrome,modal,centerscreen,width=550,height=330';
    //close=no
    try {
      window.open(url, 'resolver', options);
    } catch(err) {
      phinishphish.log('there was a problem while opening the window:' + err);
      // TODO We just return a fake positive resolution outcome, to mask this
      // error. This is DANGEROUS but heck, it's a prototype!
      // A 'null' intention indicates that the resolution has failed.
      this.pending[domain] =
          {'domain': domain, 'isAllowed': true, 'query': null};
      phinishphish.trace('error', domain);
    }
  //} TODO

  var outcome = this.pending[domain];
  delete this.pending[domain]; // Not pending anymore.
  return outcome;
};

phinishphish.SpoofBlocker.prototype.receiveMessage = function(data) {
  phinishphish.log('received message: ' + data);
  var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);  
  var outcome = nativeJSON.decode(decodeURI(data));

  if (this.pending[outcome.domain] !== undefined) {
    this.pending[outcome.domain] = outcome;
  }
};
