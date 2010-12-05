phinishphish.ReqObserver = function(callback) {
  this.callback = callback;
  this.register();
}

phinishphish.ReqObserver.prototype.register = function() {
  var obsService = Cc["@mozilla.org/observer-service;1"]  
      .getService(Ci.nsIObserverService);  
  obsService.addObserver(this, "http-on-modify-request", false); 
};

phinishphish.ReqObserver.prototype.observe = function(subject, topic, data) {
  if (topic == 'http-on-modify-request') {
    subject.QueryInterface(Ci.nsIHttpChannel);
    this.callback(subject);
  }
};

phinishphish.ReqObserver.prototype.unregister = function() {
  var obsService = Cc["@mozilla.org/observer-service;1"]  
      .getService(Ci.nsIObserverService);  
  obsService.removeObserver(this, "http-on-modify-request");
};
