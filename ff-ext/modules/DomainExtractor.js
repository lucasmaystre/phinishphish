var EXPORTED_SYMBOLS = [];  
const Cc = Components.classes;  
const Ci = Components.interfaces; 

Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

/**
 * DomainExtractor - finds the high-level domain of hostname.
 *
 * The idea is to extract from a hostname the first domain name that has been
 * publicly registered. It's a top-level domain in some sense - but that
 * terminology is already taken :(
 *
 * This class uses Mozilla's Public Suffix List:
 * http://http://publicsuffix.org/
 */
PPModules.DomainExtractor = function() {
  this.rules = {};
  this.isReady = false;
  this.consoleService = Cc["@mozilla.org/consoleservice;1"]
      .getService(Ci.nsIConsoleService);
  this._startInit();
};

PPModules.DomainExtractor.BLANK_LINE = new RegExp("^\\s*$");
PPModules.DomainExtractor.COMMENT_LINE = new RegExp("^//");
PPModules.DomainExtractor.ADDON_ID = "phinishphish@lucas.maystre.ch";

/** Tries to extract a rule from a line in the public suffix list. */
PPModules.DomainExtractor.prototype._getRule = function(line) {
  if (PPModules.DomainExtractor.BLANK_LINE.test(line)) {
    return null;  // Line is blank, no rule.
  } else if (PPModules.DomainExtractor.COMMENT_LINE.test(line)) {
    return null;  // Line starts with comment, no rule.
  }
  // Each line is read up to the first whitespace.
  var rule = line.split(/\s+/)[0];
  return rule.length > 0 ? rule : null;
};

PPModules.DomainExtractor.prototype._startInit = function() {
  // Get the path to the extension.
  var that = this;
  AddonManager.getAddonByID(PPModules.DomainExtractor.ADDON_ID,
    function(addon) {
      var pslPath = addon.getResourceURI("public-suffixes.dat").
          QueryInterface(Components.interfaces.nsIFileURL).file.path;
      that._initRules(pslPath);
    });  
};

/** Initializes the rules by parsing the public suffix list. */
PPModules.DomainExtractor.prototype._initRules = function(pslPath) {
  // Get the Public Suffix List (PSL).
  var psl = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
  psl.initWithPath(pslPath);
  if (!psl.exists()) {
    // All hell breaks lose! TODO: find how to recover from here.
    this._log("suffix list doesn't exist (path: " + pslPath + ")");
    return;
  }
  // Read the list.
  var that = this;
  NetUtil.asyncFetch(psl, function(stream, status) {
      that._readFile(stream, status);
    });
};

PPModules.DomainExtractor.prototype._readFile = function(stream, status) {
  if (!Components.isSuccessCode(status)) {
    this._log("couldn't read the suffix list");
    // TODO: find how to recover from here.
    return;
  }
  var lines = NetUtil.readInputStreamToString(stream, stream.available())
      .split("\n");
  for (var i = 0; i < lines.length; ++i) {
    var rule = this._getRule(lines[i]);
    if (rule !== null) {
      this.rules[rule] = true;  // Value is irrelevant.
    }
  }
  this.isReady = true;
};

/**
 * Returns the highest level domain that can be publicly registered. Uses
 * Mozilla's public suffix list.
 *
 * Note that what we return is an *approximation* -- we don't respect
 * exceptions, i.e. rules starting with a bang (!). This is OK in the sense that
 * exceptions only relax stricter rules.
 *
 * Examples:
 * - foo.org -> foo.org
 * - foo.bar.com -> bar.com
 * - foo.co.uk -> foo.co.uk
 * - foo.bar.pvt.k12.ma.us -> bar.pvt.k12.ma.us
 */
PPModules.DomainExtractor.prototype.extract = function(fqdn) {
  var labels = fqdn.split(".");
  var suffix = null;
  var parentSuffix = null;

  // Get the public suffix, starting from the most specific to most general
  for (var i = 1; i < labels.length; ++i) {
    // Generate domain suffixes.
    suffix = labels.slice(i).join(".");
    parentSuffix = labels.slice(i + 1).join(".");

    if (suffix in this.rules || "*." + parentSuffix in this.rules) {
      // Public suffix found. Add one more label to get the domain.
      return labels.slice(i - 1).join(".");
    }   
    parentSuffix = suffix;
  }

  // Didn't find a public suffix in the list - maybe the fqdn is invalid?
  return null;
};

PPModules.DomainExtractor.prototype._log = function(str) {
  this.consoleService.logStringMessage(str);
};
