var EXPORTED_SYMBOLS = [];
const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://phinishphish/namespace.js");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

/**
 * ActivityLogger - collects browsing / spoof protection activity.
 */
PPModules.ActivityLogger = function() {
  let file = FileUtils.getFile("ProfD", [PPModules.ActivityLogger.DB_NAME]);
  this.dbConn = Services.storage.openDatabase(file);
  this.consoleService = Cc["@mozilla.org/consoleservice;1"]
      .getService(Ci.nsIConsoleService);

  var that = this;
  this.writeHandler = {
    handleResult: function(resultSet) {
      // This handler deals only with write queries. Don't do anything.
    },
    handleError: function(error) {
      that._log("SQL query produced error: " + error.message);
    },
    handleCompletion: function(reason) {
      if (reason != Ci.mozIStorageStatementCallback.REASON_FINISHED) {
        that._log("SQL query cancelled or aborted.");
      }
    }
  }
};

PPModules.ActivityLogger.DB_NAME = 'phinishphish.sqlite';

/** Write query to log a request. */
PPModules.ActivityLogger.REQUEST_QUERY = "INSERT INTO "
    + "requests (timestamp, url, has_input, is_suspect) "
    + "VALUES (:timestamp, :url, :has_input, :is_suspect)";
/** Read query to get whether the hostname is already in the suspects table. */
PPModules.ActivityLogger.HOSTNAME_QUERY = "SELECT id FROM "
    + "suspects WHERE hostname = :hostname";
/** Write query to log a resolution. */
PPModules.ActivityLogger.SUSPECT_QUERY = "INSERT INTO "
    + "suspects (timestamp, hostname, keyword, is_allowed, reputation, "
    + "confidence, search_res) VALUES (:timestamp, :hostname, :keyword, "
    + ":is_allowed, :reputation, :confidence, :search_res)";

PPModules.ActivityLogger.prototype._log = function(str) {
  this.consoleService.logStringMessage(str);
};

/**
 * Stores a log entry for a request in the database.
 *
 * params should contain the following fields:
 * - url
 * - has_input
 * - is_suspect
 */
PPModules.ActivityLogger.prototype.logRequest = function(params) {
  // Construct the SQL statement.
  let stmt = this.dbConn.createStatement(
      PPModules.ActivityLogger.REQUEST_QUERY);
  stmt.params.url        = params.url;
  stmt.params.has_input  = params.has_input;
  stmt.params.is_suspect = params.is_suspect;
  stmt.params.timestamp  = Math.floor(+new Date()/1000);

  // Execute the statement.
  stmt.executeAsync(this.writeHandler);
  stmt.finalize();
};

/**
 * Stores a log entry for a resolution (i.e. everytime we asked the user his
 * intention).
 *
 * params should contain the following fields:
 * - hostname
 * - keyword
 * - is_allowed
 * - reputation
 * - confidence
 * - search_res
 */
PPModules.ActivityLogger.prototype.logResolution = function(params) {
  // Construct the SQL statement.
  let stmt = this.dbConn.createStatement(
      PPModules.ActivityLogger.SUSPECT_QUERY);
  stmt.params.hostname   = params.hostname;
  stmt.params.keyword    = params.keyword;
  stmt.params.is_allowed = params.is_allowed;
  stmt.params.reputation = params.reputation;
  stmt.params.confidence = params.confidence;
  stmt.params.search_res = params.search_res;
  stmt.params.timestamp  = Math.floor(+new Date()/1000);

  // Execute the statement.
  stmt.executeAsync(this.writeHandler);
  stmt.finalize();
};

/**
 * Looks up the database to see if the hostname has already been resolved once.
 */
PPModules.ActivityLogger.prototype.isResolved = function(hostname) {
  var isResolved = false;
  let stmt = this.dbConn.createStatement(
      PPModules.ActivityLogger.HOSTNAME_QUERY);
  stmt.params.hostname = hostname;
  try {
    if (stmt.executeStep()) {
      // We found a match. No need to go further.
      isResolved = true
    }
  }
  finally {
    stmt.reset();
  }
  return isResolved;
};
