-- Newsletter Subscription Tables Migration
-- Migrates newsletter functionality from R2 JSON to D1

-- Subscribers table: stores newsletter subscriptions
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'website',
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Newsletter audit trail: immutable log of all subscription events
CREATE TABLE IF NOT EXISTS newsletter_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK (action IN ('subscribe', 'unsubscribe')),
  email TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT,
  original_subscribed_at TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Rate limiting table: tracks request counts per IP
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  PRIMARY KEY (ip_address, endpoint, timestamp)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_audit_email ON newsletter_audit(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_audit_timestamp ON newsletter_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(timestamp);
