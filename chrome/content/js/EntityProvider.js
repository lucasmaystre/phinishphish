Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://phinishphish/globals.js");

/**
 * A cached interface to the Entity API. The main functionality is provided by
 * the 'lookup' method.
 *
 * Author: Lucas Maystre <lucas@maystre.ch>
 */
phinishphish.EntityProvider = function() {
  this.cache = PPModules.entityCache;
}

/** Entity data structure */
phinishphish.Entity = function() {
  this.id = null;
  this.isProvider = false;
  this.longName = null;
  this.shortName = null;
  this.imageUrl = null;
  this.domains = new Array();
};

/** Domain data structure */
phinishphish.Domain = function() {
  this.id = null;
  this.isPrimary = false;
  this.name = null;
};

    /** The URL prefix for the API calls. */
phinishphish.EntityProvider.URL_PREFIX =
    "https://chi.lum.li/entities/";

/** The maximal number of elements in the cache. */
phinishphish.EntityProvider.CACHE_SIZE = 100;

/** The TTL for cache items. */
phinishphish.EntityProvider.CACHE_TTL = 3600; // 1 hour.

/** Small helper function to compute when a new cache entry expires. */
phinishphish.EntityProvider.exp = function() {
  // In milliseconds since UNIX epoch.
  var expiration = (new Date()).getTime()
      + phinishphish.EntityProvider.CACHE_TTL * 1000;
  return new Date(expiration);
};

/**
 * Queries entities matching a particular query string, using an asynchronous
 * request, therefore it is possible to register a callback function.
 */
phinishphish.EntityProvider.prototype.lookup = function(query, callback) {
  // First, lookup the cache to see if we can speed things up.
  if (this.cache.getItem(query) != null) {
    if (callback) {
      callback.call(null, this.cache.getItem(query));
      return;
    }
  }

  var url = phinishphish.EntityProvider.URL_PREFIX + encodeURI(query);
  var req = new XMLHttpRequest();
  req.open('GET', url, true); // Asynchronous request.

  req.onreadystatechange = phinishphish.bind(this,
      function() {
        if (req.readyState == 4) { // COMPLETED
          var entities = false;
          if (req.status == 200) {
            entities = this.parse(req.responseXML);
            // Cache the result for later access.
            this.cache.setItem(query, entities,
                {'expirationAbsolute': phinishphish.EntityProvider.exp()});
          }
          if (callback) {
            callback.call(null, entities);
            return;
          }
        }
      });

  req.send(null);
};

/**
 * Transforms a Entity API XML response to an array of Entity objects.
 */
phinishphish.EntityProvider.prototype.parse = function(dom) {
  var entities = new Array();

  // Iterate over the entities;
  var nodes = dom.getElementsByTagName('entity');
  for (var i = 0; i < nodes.length; ++i) {
    var entity = new phinishphish.Entity();
    if (nodes[i].hasAttribute('id')) {
      entity.id = nodes[i].getAttribute('id');
    }
    if (nodes[i].getElementsByTagName('provider').length > 0) {
      entity.isProvider = nodes[i].getElementsByTagName('provider')[0]
          .textContent == 't' ? true : false
    }
    if (nodes[i].getElementsByTagName('lname').length > 0) {
      entity.longName = nodes[i].getElementsByTagName('lname')[0].textContent;
    }
    if (nodes[i].getElementsByTagName('sname').length > 0) {
      entity.shortName = nodes[i].getElementsByTagName('sname')[0].textContent;
    }
    if (nodes[i].getElementsByTagName('image').length > 0) {
      entity.imageUrl = nodes[i].getElementsByTagName('image')[0].textContent;
    }
    var domains = new Array();
    
    // Iterate over the domains.
    var domainNodes = nodes[i].getElementsByTagName('domain');
    for (var j = 0; j < domainNodes.length; ++j) {
      var domain = new phinishphish.Domain();
      if (domainNodes[j].hasAttribute('id'))  {
        domain.id = domainNodes[j].getAttribute('id');
      }
      if (domainNodes[j].hasAttribute('primary')) {
        domain.isPrimary =
            domainNodes[j].getAttribute('primary') == 't' ? true : false;
      }
      domain.name = domainNodes[j].textContent;
      domains.push(domain);
    }
    entity.domains = domains;
    entities.push(entity);
  }
  return entities;
};
