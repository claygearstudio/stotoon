CREATE TABLE IF NOT EXISTS beta_applicants (
 id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, purpose TEXT NOT NULL,
 message TEXT NOT NULL, consent_version TEXT NOT NULL, created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL, mode TEXT NOT NULL, notification TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0, first_attempt TEXT, last_attempt TEXT, provider_id TEXT,
 UNIQUE(email,mode)
);
CREATE INDEX IF NOT EXISTS beta_expiry ON beta_applicants(expires_at);
CREATE INDEX IF NOT EXISTS beta_pending ON beta_applicants(notification,last_attempt);
CREATE TABLE IF NOT EXISTS beta_metrics(day TEXT NOT NULL,mode TEXT NOT NULL,pageviews INTEGER NOT NULL DEFAULT 0,signups INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,mode));
CREATE TRIGGER IF NOT EXISTS beta_signup_count AFTER INSERT ON beta_applicants BEGIN
 INSERT INTO beta_metrics(day,mode,signups) VALUES(substr(NEW.created_at,1,10),NEW.mode,1)
 ON CONFLICT(day,mode) DO UPDATE SET signups=signups+1;
END;
