-- Double Opt-In Migration
-- Adds confirmation status and token to subscribers table

-- Add status column (pending = unconfirmed, confirmed = verified)
ALTER TABLE subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed'));

-- Add confirmation token for email verification
ALTER TABLE subscribers ADD COLUMN confirmation_token TEXT;

-- Add confirmation timestamp
ALTER TABLE subscribers ADD COLUMN confirmed_at TEXT;

-- Add token expiration (24 hours from creation)
ALTER TABLE subscribers ADD COLUMN token_expires_at TEXT;

-- Index for fast token lookups during confirmation
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmation_token ON subscribers(confirmation_token);

-- Index for filtering by status (notifications only go to confirmed)
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

-- Update audit trail to include new 'confirm' action
-- SQLite doesn't support ALTER CHECK constraint, so we need to recreate the table
-- This preserves existing data while adding the new constraint

-- Step 1: Create new table with updated constraint
CREATE TABLE IF NOT EXISTS newsletter_audit_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK (action IN ('subscribe', 'unsubscribe', 'confirm')),
  email TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT,
  original_subscribed_at TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Step 2: Copy existing data
INSERT INTO newsletter_audit_new (id, action, email, timestamp, source, original_subscribed_at, ip_address, user_agent)
SELECT id, action, email, timestamp, source, original_subscribed_at, ip_address, user_agent
FROM newsletter_audit;

-- Step 3: Drop old table
DROP TABLE newsletter_audit;

-- Step 4: Rename new table
ALTER TABLE newsletter_audit_new RENAME TO newsletter_audit;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_audit_email ON newsletter_audit(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_audit_timestamp ON newsletter_audit(timestamp);
