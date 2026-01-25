-- Subscriber Preferences Migration
-- Implements opt-out model: no rows = receive everything
-- Only stores explicit opt-outs to minimize storage

-- Tool preferences: which AI coding tools the subscriber wants updates for
-- If no row exists for a tool, subscriber receives updates for that tool (opt-out model)
CREATE TABLE IF NOT EXISTS subscriber_tool_preferences (
  subscriber_id TEXT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (subscriber_id, tool_id)
);

-- Content type preferences: which types of content the subscriber wants
-- Types: 'release' (individual releases), 'weekly-digest', 'monthly-comparison'
-- If no row exists for a content type, subscriber receives that content (opt-out model)
CREATE TABLE IF NOT EXISTS subscriber_content_preferences (
  subscriber_id TEXT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('release', 'weekly-digest', 'monthly-comparison')),
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (subscriber_id, content_type)
);

-- Indexes for efficient preference lookups
CREATE INDEX IF NOT EXISTS idx_tool_prefs_subscriber ON subscriber_tool_preferences(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_tool_prefs_tool ON subscriber_tool_preferences(tool_id);
CREATE INDEX IF NOT EXISTS idx_content_prefs_subscriber ON subscriber_content_preferences(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_content_prefs_type ON subscriber_content_preferences(content_type);

-- Audit trail for preference changes
-- Extends the existing newsletter_audit action types
-- Note: Run this separately if you need to alter the CHECK constraint
-- ALTER TABLE newsletter_audit ADD CHECK (action IN ('subscribe', 'unsubscribe', 'preference-update'));
