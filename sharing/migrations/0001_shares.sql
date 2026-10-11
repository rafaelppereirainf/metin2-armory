CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  owner_hash TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX shares_client_created ON shares (client_hash, created_at);
CREATE INDEX shares_created ON shares (created_at);
