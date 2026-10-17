-- Preparation only: no push endpoints or notification sending are enabled.
CREATE TABLE IF NOT EXISTS app_users (
  access_sub TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY,
  access_sub TEXT NOT NULL REFERENCES app_users(access_sub) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notification_preferences (
  access_sub TEXT PRIMARY KEY REFERENCES app_users(access_sub) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
  categories_json TEXT NOT NULL DEFAULT '[]',
  reminder_minutes INTEGER NOT NULL DEFAULT 1440 CHECK(reminder_minutes >= 0)
);
CREATE TABLE IF NOT EXISTS notification_deliveries (
  subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  reminder_at TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(subscription_id, event_key, reminder_at)
);
