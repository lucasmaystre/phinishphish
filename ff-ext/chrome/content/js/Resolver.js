/**
 * Provides the control logic for the resolution window.
 *
 * Author: Lucas Maystre <lucas@maystre.ch>
 */
phinishphish.Resolver = function() {
  // Environment.
  this.searchProv = new phinishphish.SearchProvider(); // Cached search provider.
  this.mainDeck = null; // Will be set once the window is loaded.
  this.targetDomain = null;

  // State variables.
  this.state = null; // Current window state.
  this.lastQuery = ''; // Last search query.
};

phinishphish.Resolver.prototype.run = function() {
  // The host for which we resolve is given in the URL of the resolution window.
  this.targetDomain = phinishphish.param(window.location.toString(), 'target');
  // Handle the case where the window is improperly called with no host.
  this.targetDomain = this.targetDomain == null ? '' : this.targetDomain;

  phinishphish.trace('resolve', this.targetDomain)
  this.listen();
  this.initSearch();
}

/** The different states of the window. */
phinishphish.Resolver.STATE =
    {'load': 0, 'search': 1, 'allow': 2};

/** Shortcut to get an element by its ID. */
phinishphish.Resolver.prototype.elem = function(id) {
  return document.getElementById('pp-' + id);
}

phinishphish.Resolver.prototype.initLoad = function(text) {
  // Set the current state.
  this.state = phinishphish.Resolver.STATE.load;

  this.mainDeck.setAttribute('selectedIndex',
      phinishphish.Resolver.STATE.load);
  this.elem('loadStatus').setAttribute('label', text);
  this.elem('progressBar').style.display = null;
};

phinishphish.Resolver.prototype.initSearch = function() {
  // Set the current state.
  this.state = phinishphish.Resolver.STATE.search;

  // Empty the textbox.
  this.elem('searchInput').value = '';
  
  // Display the 'search' panel.
  this.mainDeck.setAttribute('selectedIndex',
      phinishphish.Resolver.STATE.search);

  // Update the status and the progress bar.
  this.elem('loadStatus').setAttribute('label', 'Ready.');
  this.elem('progressBar').style.display = 'none';

  // Focus on the search bar.
  this.elem('searchInput').focus();
};

phinishphish.Resolver.prototype.handleSearch = function() {
  // Check if we're in the right state.
  if (this.state = phinishphish.Resolver.STATE.search) {
    var query = this.elem('searchInput').value;
    if (query.length < 2) {
      var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
          .getService(Ci.nsIPromptService);
      promptService.alert(window, 'Your query is too short.',
          'Enter at least 2 characters.');
    } else {
      phinishphish.log('searching for ' + query);
      this.lastQuery = query;
      this.initLoad('Searching...');
      this.searchProv.search(query, phinishphish.bind(this, this.handleResults));
    }
  } 
};

phinishphish.Resolver.prototype.handleResults = function(results, rawRes) {
  var result = this.match(this.targetDomain, results);

  // Send the result of the resolution to the SpoofBlocker.
  this.notifyOutcome({
    'domain'   : this.targetDomain,
    'isAllowed': (result !== null),
    'query'    : this.lastQuery,
    'result'   : result,
    'rawResult': rawRes
  });

  if (result !== null) {
    // Display a short message if we allow. Takes care of closing the window.
    this.initAllow();
  } else {
    // Resolution completed, we can close the window.
    window.close();
  }
};

/**
 * The matching algorithm. Determines whether or not to allow a target domain
 * based on a set of candidate URLs (ranked search results).
 */
phinishphish.Resolver.prototype.match = function(target, candidates) {
  // for now, it's still the same old algorithm...
  var suffix = phinishphish.extractDomain(target)
  // First of all, sort the results by ascending rank.
  candidates.sort(function(a, b) { return a.rank > b.rank; });

  // Match the results against the target domain.
  var result = null;
  for (var i = 0; i < candidates.length; ++i) {
    var candidateSuffix = phinishphish.extractDomain(candidates[i].domain);
    if (suffix == candidateSuffix) {
      result = candidates[i];
      phinishphish.log('target matched with result ' + result.link);
      break;
    }
  }
  return result;
};

phinishphish.Resolver.prototype.initAllow = function() {
  // Set the current state.
  this.state = phinishphish.Resolver.STATE.allow;

  // Display the 'allow' panel.
  this.mainDeck.setAttribute('selectedIndex',
      phinishphish.Resolver.STATE.allow);

  // Update the status and the progress bar.
  this.elem('loadStatus').setAttribute('label', 'Ready.');
  this.elem('progressBar').style.display = 'none';

  // Initiate the countdown.
  var intervalId = setInterval(phinishphish.bind(this,
      function() {
        var remaining = this.elem('allowSec').value;
        if (remaining == 0) { // Countdown is over.
          window.close();
        } else {
          // Decrement counter by 1.
          this.elem('allowSec').value = remaining - 1;
        }
      }), 1000); // Every second.
};


phinishphish.Resolver.prototype.notifyOutcome = function(outcome) {
  var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);  
  var payload = nativeJSON.encode(outcome);

  var obsService = Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService)
  var subject = Cc["@mozilla.org/supports-string;1"]
      .createInstance(Ci.nsISupportsString);
  subject.data = "Resolution is complete.";
  obsService.notifyObservers(
      subject, "phinishphish-resolution-complete", payload);
};

/**
 * Called after the window has loaded. Sets up all the event listeners.
 */
phinishphish.Resolver.prototype.listen = function() {
  this.mainDeck = document.getElementById('phinishphish-mainDeck'); //TODO

  // When displaying 'allow', a click anywhere on the window closes it.
  this.elem('boxAllow').addEventListener('click',
      function() {window.close()}, false);

  // Catch when user presses 'search'.
  this.elem('searchButton').addEventListener('command',
      phinishphish.bind(this, this.handleSearch), false);

  // Listen to key press on the search input field.
  this.elem('searchInput').addEventListener('keypress', phinishphish.bind(this,
      function(e) {
         if (e.keyCode == KeyEvent.DOM_VK_RETURN
             || e.keyCode == KeyEvent.DOM_VK_ENTER) {
           this.handleSearch();
         }
      }), false);
};
