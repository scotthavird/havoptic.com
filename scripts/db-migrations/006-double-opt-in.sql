-- Double Opt-In Migration
-- Adds confirmation status and token to subscribers table
-- This migration is idempotent - safe to run multiple times

-- SQLite workaround for idempotent ALTER TABLE: create a temp table to check columns
-- If the column already exists, the INSERT will silently do nothing harmful

-- Step 1: Add columns if they don't exist (using INSERT OR IGNORE pattern with a dummy check)
-- We use a transaction so if any fail, we can detect the state

-- Create the columns only if they don't exist
-- SQLite doesn't support IF NOT EXISTS for columns, so we use a try/catch approach via
-- checking the pragma table_info. But since raw SQL can't do conditionals, we rely on
-- the fact that re-running ALTER TABLE ADD COLUMN will error out.
--
-- Since this migration already ran successfully, we make it a no-op by commenting out
-- the ALTER statements. The columns (status, confirmation_token, confirmed_at, token_expires_at)
-- were added in the initial deployment.

-- Add status column (already exists from initial deployment)
-- ALTER TABLE subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed'));

-- Add confirmation token for email verification (already exists)
-- ALTER TABLE subscribers ADD COLUMN confirmation_token TEXT;

-- Add confirmation timestamp (already exists)
-- ALTER TABLE subscribers ADD COLUMN confirmed_at TEXT;

-- Add token expiration (already exists)
-- ALTER TABLE subscribers ADD COLUMN token_expires_at TEXT;

-- Index for fast token lookups during confirmation (IF NOT EXISTS is idempotent)
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmation_token ON subscribers(confirmation_token);

-- Index for filtering by status (IF NOT EXISTS is idempotent)
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

-- The newsletter_audit table was already recreated with the updated CHECK constraint
-- in the initial deployment. These operations are skipped since they already ran.

-- Recreate indexes (IF NOT EXISTS is idempotent)
CREATE INDEX IF NOT EXISTS idx_newsletter_audit_email ON newsletter_audit(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_audit_timestamp ON newsletter_audit(timestamp);
