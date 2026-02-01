-- Push Notification Subscriptions Migration
-- Stores Web Push API subscriptions for browser notifications
-- Users can receive push alerts when watched AI tools ship new releases

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  tool_filters TEXT,  -- JSON array synced with watchlist (null = all tools)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  failed_attempts INTEGER DEFAULT 0
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_failed ON push_subscriptions(failed_attempts);
