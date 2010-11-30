var EXPORTED_SYMBOLS = [];  
const Cc = Components.classes;  
const Ci = Components.interfaces; 

// Import namespace declaration and classes.
Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://phinishphish/Cache.js");

// The two caches used as singleton across the browser.
PPModules.entityCache = new PPModules.Cache(100); // cache size of 100.
PPModules.trustCache = new PPModules.Cache(100); // cache size of 100.
