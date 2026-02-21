-- Email Tracking Migration
-- Adds tables for recording email sends and tracking events (opens, clicks)

-- Table: email_sends
-- Records every email sent to a subscriber
CREATE TABLE IF NOT EXISTS email_sends (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT REFERENCES subscribers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('release', 'blog', 'confirmation', 'welcome')),
  subject TEXT,
  metadata TEXT,
  sent_at TEXT NOT NULL
);

-- Table: email_events
-- Records open and click events for tracked emails
CREATE TABLE IF NOT EXISTS email_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  send_id TEXT NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
  link_url TEXT,
  link_label TEXT,
  ip TEXT,
  user_agent TEXT,
  occurred_at TEXT NOT NULL
);

-- Indexes for email_sends
CREATE INDEX IF NOT EXISTS idx_email_sends_subscriber_id ON email_sends(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_message_type ON email_sends(message_type);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at);

-- Indexes for email_events
CREATE INDEX IF NOT EXISTS idx_email_events_send_id ON email_events(send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_occurred_at ON email_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_events_send_id_event_type ON email_events(send_id, event_type);
