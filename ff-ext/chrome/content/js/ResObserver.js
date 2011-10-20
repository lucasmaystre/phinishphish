phinishphish.ResObserver = function(callback) {
  this.callback = callback;
  this.register();
}

phinishphish.ResObserver.prototype.register = function() {
  var obsService = Cc["@mozilla.org/observer-service;1"]  
      .getService(Ci.nsIObserverService);  
  obsService.addObserver(this, "phinishphish-resolution-complete", false); 
};

phinishphish.ResObserver.prototype.observe = function(subject, topic, data) {
  if (topic == 'phinishphish-resolution-complete') {
    this.callback(data);
  }
};

phinishphish.ResObserver.prototype.unregister = function() {
  var obsService = Cc["@mozilla.org/observer-service;1"]  
      .getService(Ci.nsIObserverService);  
  obsService.removeObserver(this, "phinishphish-resolution-complete");
};
