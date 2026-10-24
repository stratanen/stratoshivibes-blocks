-- StratoshiVibes Blockspace leaderboard (Cloudflare D1)
CREATE TABLE IF NOT EXISTS scores (
  addr TEXT NOT NULL,          -- player's public Solana address
  period TEXT NOT NULL,        -- 'all' or an ISO week like '2026-W44'
  best INTEGER NOT NULL,
  at INTEGER NOT NULL,         -- unix ms of the best score
  PRIMARY KEY (addr, period)
);
CREATE INDEX IF NOT EXISTS scores_rank ON scores (period, best DESC, at ASC);
CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, addr TEXT NOT NULL, exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, addr TEXT NOT NULL, exp INTEGER NOT NULL, last INTEGER NOT NULL DEFAULT 0);
