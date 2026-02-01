-- User Tool Watchlist Migration
-- Allows authenticated users to "watch" specific AI coding tools
-- Watched tools appear in a personalized "Watching" filter on the timeline

-- User watchlist: which tools a user is actively watching
CREATE TABLE IF NOT EXISTS user_tool_watchlist (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, tool_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_tool_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tool ON user_tool_watchlist(tool_id);
