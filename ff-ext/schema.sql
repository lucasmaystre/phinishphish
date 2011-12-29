-- This is a quick and dirty SQL schema. We could definitely come up with
-- something leaner...

-- ********
-- Contains every single request. The field is_suspect is valid only if the
-- field has_input is set to true.
-- ********
CREATE TABLE requests (
  'id'         INTEGER NOT NULL PRIMARY KEY,
  'timestamp'  INTEGER NOT NULL,
  'url'        TEXT NOT NULL,
  'has_input'  TEXT NOT NULL,
  'is_suspect' BOOLEAN
);

-- ********
-- Contains every domain for which we triggered the resolution.
-- ********
CREATE TABLE suspects (
  'id'         INTEGER NOT NULL PRIMARY KEY,
  'timestamp'  INTEGER NOT NULL,
  'hostname'   TEXT NOT NULL,
  'keyword'    TEXT NOT NULL,
  'is_allowed' BOOLEAN NOT NULL,  -- outcome of the resolution
  'reputation' INTEGER NOT NULL,  -- reputation score, as per WoT
  'confidence' INTEGER NOT NULL,  -- trust score, as per WoT
  'search_res' TEXT NOT NULL  -- serialization of all search results
);

-- This is the only read query the extension does... Look-up if the hostname
-- exists.
CREATE INDEX suspects_hostname_idx ON suspects('hostname');
