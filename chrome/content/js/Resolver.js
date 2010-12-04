/**
 * Provides the control logic for the resolution window.
 *
 * Author: Lucas Maystre <lucas@maystre.ch>
 */
phinishphish.Resolver = function() {
  // Environment.
  this.entityProv = new phinishphish.EntityProvider(); // Cached entity provider.
  this.mainDeck = null; // Will be set once the window is loaded.
  this.targetHost = null;

  // State variables.
  this.state = null; // Current window state.
  this.lastQuery = ''; // Last entities query.
  this.lastEntities = new Array(); // Last array of entities received.
  this.hasSearched = false; // Defines behavior of click on 'other'.
};

phinishphish.Resolver.prototype.run = function() {
  this.targetHost = phinishphish.param(window.location.toString(), 'target');
  phinishphish.trace('resolve', this.targetHost)
  // Handle the case where the window is improperly called with no host.
  this.targetHost = this.targetHost == null ? '' : this.targetHost;
  this.listen();
  this.initLoad('Initializing...');
  this.entityProv.lookup(this.targetHost,
      phinishphish.bind(this, this.handleInitialLookup));
}

phinishphish.Resolver.prototype.handleInitialLookup = function(entities) {
  if (entities.length > 0) {
    this.initSelect(entities);
  } else {
    this.initSearch();
  }
}

/** The different states of the window. */
phinishphish.Resolver.STATE =
    {'load': 0, 'search': 1, 'select': 2, 'unknown': 3};

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
      this.lastQuery = query;
      this.hasSearched = true;
      this.initLoad('Searching...');
      this.entityProv.lookup(query, phinishphish.bind(this, this.initSelect));
    }
  } 
};

phinishphish.Resolver.prototype.initSelect = function(entities) {
  if (this.hasSearched) {
    this.elem('selectorHeader').style.display = null;
    this.elem('queryLabel').value = this.lastQuery;
  } else {
    this.elem('selectorHeader').style.display = 'none';
  }
  // Set the current state.
  this.state = phinishphish.Resolver.STATE.select;
  this.lastEntities = entities;
  
  // Delete all the entities from last time (if any).
  var candidates = this.elem('selectCols').children;
  for (var i = 0; i < candidates.length; ++i) {
    var candidate = candidates[i];
    if (candidate.tagName == 'column'
        && candidate.getAttribute('id') != 'pp-col--1') {
      this.elem('selectCols').removeChild(candidate);
      // This comes from the fact that 'candidates' references to a set of
      // children that is changing when we delete one of them.
      --i;
    }
  }

  // Handle the case where we didn't find anything.
  if (entities.length == 0) {
    this.initUnknown();
    return;
  }

  // Display the new entities.
  for (var i = 0; i < entities.length; ++i) {
    var entity = entities[i];
    
    // <column>
    var col = document.createElement('column');
    col.setAttribute('id', 'pp-col-' + entity.id);
    col.setAttribute('align', 'center');

    // <image>
    var img = document.createElement('image');
    img.setAttribute('id', 'pp-img-' + entity.id);
    img.setAttribute('src', entity.imageUrl);
    img.setAttribute('width', '128px');
    img.setAttribute('height', '128px');
    img.addEventListener('click', phinishphish.bind(
        this, this.handleSelect), false);

    // <label>
    var lbl = document.createElement('label');
    lbl.setAttribute('value', entity.shortName != null ? entity.shortName : '');

    col.appendChild(img);
    col.appendChild(lbl);
    this.elem('selectCols').insertBefore(col, this.elem('col--1'));
  }

  // Display the 'select' panel.
  this.mainDeck.setAttribute('selectedIndex',
      phinishphish.Resolver.STATE.select);

  // Update the status and the progress bar.
  this.elem('loadStatus').setAttribute('label', 'Ready.');
  this.elem('progressBar').style.display = 'none';
};

phinishphish.Resolver.prototype.initUnknown = function() {
  // Set the current state.
  this.state = phinishphish.Resolver.STATE.unknown;

  // Display the 'select' panel.
  this.mainDeck.setAttribute('selectedIndex',
      phinishphish.Resolver.STATE.unknown);

  // Update the status and the progress bar.
  this.elem('loadStatus').setAttribute('label', 'Ready.');
  this.elem('progressBar').style.display = 'none';

  // Notify the spoof blocker of the resolution, and trace it.
  this.notifyOutcome({
    'hostname' : this.targetHost,
    'isAllowed': true,
    'intention': {'id': -1} // -1 means 'other'.
  });
  phinishphish.trace('select', -1);

  // Initiate the countdown.
  var intervalId = setInterval(phinishphish.bind(this,
      function() {
        var remaining = this.elem('unknownSec').value;
        if (remaining == 0) { // Countdown is over.
          window.close();
        } else {
          // Decrement counter by 1.
          this.elem('unknownSec').value = remaining - 1;
        }
      }), 1000); // Every second.
};

phinishphish.Resolver.prototype.handleSelect = function(event) {
  var elem = event.originalTarget;
  if (!elem.hasAttribute('id')) {
    return; // Shouldn't happen...
  }
  var id = parseInt(elem.getAttribute('id').substring(7)); // Strip 'pp-col-'.
  phinishphish.log('clicked on col with id=' + id);
  var match = false; // True if the user's intention matches.
  var entity = null; // The entity on which he clicked.
  if (id == -1) { // 'other' was selected.
    if (!this.hasSearched) {
      this.initSearch();
      return;
    } else {
      // This happens when a website is not in the database. At least we know
      // that it's not forging one of the entities in the database.
      // TODO There's one corner case: the user clicked on 'other' although the
      // hostname matched with one of the entities. We should deny this?
      this.initUnknown();
      return;
    }
  } else { // Click on an entity returned by the Entity API.
    for (var i = 0; i < this.lastEntities.length; ++i) {
      if (this.lastEntities[i].id == id) {
        entity = this.lastEntities[i];
        break;
      }
    }
    if (!entity) {
      return; // Shouldn't happen...
    }
    for (var i = 0; i < entity.domains.length; ++i) {
      if (entity.domains[i].name == this.targetHost) {
        match = true;
        break;
      }
    }
  }

  // Send the result of the resolution to the SpoofBlocker.
  this.notifyOutcome({
    'hostname' : this.targetHost,
    'isAllowed': match,
    'intention': entity
  });

  // Trace the resolution.
  phinishphish.trace('select', id);

  // Resolution completed, we can close the window.
  window.close();
};

phinishphish.Resolver.prototype.notifyOutcome = function(outcome) {
  var nativeJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);  
  var payload = nativeJSON.encode(outcome);

  var obsService = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
  var subject = Components.classes["@mozilla.org/supports-string;1"]
      .createInstance(Components.interfaces.nsISupportsString);
  subject.data = "Resolution is complete.";
  obsService.notifyObservers(
      subject, "phinishphish-resolution-complete", payload);
};

/**
 * Called after the window has loaded. Sets up all the event listeners.
 */
phinishphish.Resolver.prototype.listen = function() {
  this.mainDeck = document.getElementById('phinishphish-mainDeck'); //TODO

  this.elem('col--1').addEventListener('click', phinishphish.bind(
      this, this.handleSelect), false);
  this.elem('changeQuery').addEventListener('click', phinishphish.bind(
      this, this.initSearch), false);

  // When disyplaying 'unknown', a click anywhere on the window closes it.
  this.elem('boxUnknown').addEventListener('click',
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

  // document.getElementById('phinishphish-buttonProgress')
  //     .addEventListener('click', phinishphish.bind(
  //         this, this.initLoad, 'Initializing...'), false);
  // document.getElementById('phinishphish-buttonInput')
  //     .addEventListener('click', phinishphish.bind(
  //         this, this.initSearch), false);
  // document.getElementById('phinishphish-buttonSelector')
  //     .addEventListener('click', phinishphish.bind(
  //         this, this.initSelect, []), false);
  // document.getElementById('phinishphish-buttonUnknown')
  //     .addEventListener('click', phinishphish.bind(
  //         this, this.initUnknown), false);
};
