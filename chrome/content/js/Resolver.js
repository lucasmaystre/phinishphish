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
  this.initiallyShownSelect = null; // True if the first screen was a selection.
};

phinishphish.Resolver.prototype.run = function() {
  this.targetHost = phinishphish.param(window.location.toString(), 'target');
  // Handle the case where the window is improperly called with no host.
  this.targetHost = this.targetHost == null ? '' : this.targetHost;
  this.listen();
  this.initLoad('Initializing...');
  this.entityProv.lookup(this.targetHost,
      phinishphish.bind(this, this.handleInitialLookup));
}

phinishphish.Resolver.prototype.handleInitialLookup = function(entities) {
  if (entities.length > 0) {
    this.initiallyShownSelect = true;
    this.initSelect(entities);
  } else {
    this.initiallyShownSelect = false;
    this.initSearch();
  }
}

/** The different states of the window. */
phinishphish.Resolver.STATE = {'load': 0, 'search': 1, 'select': 2};

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
  this.elem('progressBar').setAttribute('mode', 'undetermined');
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
  this.elem('progressBar').setAttribute('mode', 'determined');

  // Focus on the search bar.
  this.elem('searchInput').focus();

  // Catch when user presses 'enter'.
  this.elem('searchInput').addEventListener('keypress', phinishphish.bind(this,
      function(e) {
         if (e.keyCode == KeyEvent.DOM_VK_RETURN
             || e.keyCode == KeyEvent.DOM_VK_ENTER) {
           this.handleSearch();
         }
      }), false);

  // Catch when user presses 'search'.
  this.elem('searchButton').addEventListener('command',
      phinishphish.bind(this, this.handleSearch), false);
};

phinishphish.Resolver.prototype.handleSearch = function() {
  // Check if we're in the right state.
  if (this.state = phinishphish.Resolver.STATE.search) {
    var query = this.elem('searchInput').value;
    if (query.length < 2) {
      window.alert('Your query is too short. The minimum 2 characters.');
    } else {
      this.lastQuery = query;
      this.initLoad('Searching...');
      this.entityProv.lookup(query, phinishphish.bind(this, this.initSelect));
    }
  } 
};

phinishphish.Resolver.prototype.initSelect = function(entities) {
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
    }
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
  this.elem('progressBar').setAttribute('mode', 'determined');
};

phinishphish.Resolver.prototype.handleSelect = function(event) {
  var elem = event.originalTarget;
  if (!elem.hasAttribute('id')) {
    return; // Shouldn't happen...
  }
  var id = parseInt(elem.getAttribute('id').substring(7)); // Strip 'pp-col-'.
  phinishphish.log('clicked on col with id=' + id);
  var match = false; // True if the user's intention matches.
  if (id == -1) { // 'other' was selected.
    if (this.initiallyShownSelect) {
      this.initSearch();
      return;
    } else {
      // This happens when a website is not in the database. At least we know
      // that it's not forging one of the entities in the database.
      match = true;
    }
  } else { // Click on an entity returned by the Entity API.
    var entity = null;
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
  var payload = encodeURI(this.targetHost) + '|' + encodeURI(match.toString());

  var obsService = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
  var subject = Components.classes["@mozilla.org/supports-string;1"]
      .createInstance(Components.interfaces.nsISupportsString);
  subject.data = "Resolution is complete.";
  obsService.notifyObservers(
      subject, "phinishphish-resolution-complete", payload);

  // Resolution completed, we can close the window.
  window.close();
};

/**
 * Called after the window has loaded. Sets up all the event listeners.
 */
phinishphish.Resolver.prototype.listen = function() {
  this.mainDeck = document.getElementById('phinishphish-mainDeck'); //TODO

  this.elem('col--1').addEventListener('click', phinishphish.bind(
      this, this.handleSelect), false);

  document.getElementById('phinishphish-buttonProgress')
      .addEventListener('click', phinishphish.bind(
          this, this.initLoad, 'Initializing...'), false);
  document.getElementById('phinishphish-buttonInput')
      .addEventListener('click', phinishphish.bind(
          this, this.initSearch), false);
  document.getElementById('phinishphish-buttonSelector')
      .addEventListener('click', phinishphish.bind(
          this, this.initSelect, []), false);
};
