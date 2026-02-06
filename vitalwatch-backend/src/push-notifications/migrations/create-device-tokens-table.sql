-- Migration: Create device_tokens table for push notifications
-- Run this migration to set up the push notifications system

CREATE TYPE device_platform AS ENUM ('ios', 'android', 'web');
CREATE TYPE token_status AS ENUM ('active', 'expired', 'invalid', 'disabled');

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token VARCHAR(1024) NOT NULL UNIQUE,
  platform device_platform NOT NULL,
  status token_status NOT NULL DEFAULT 'active',
  device_info JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMP,
  last_error_message TEXT,
  badge_count INTEGER NOT NULL DEFAULT 0,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_user_enabled ON device_tokens(user_id, enabled);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
CREATE INDEX idx_device_tokens_platform_enabled ON device_tokens(platform, enabled);
CREATE INDEX idx_device_tokens_expires_at ON device_tokens(expires_at);
CREATE INDEX idx_device_tokens_status ON device_tokens(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER device_tokens_updated_at
BEFORE UPDATE ON device_tokens
FOR EACH ROW
EXECUTE FUNCTION update_device_tokens_updated_at();

-- Add comments for documentation
COMMENT ON TABLE device_tokens IS 'Stores device tokens for push notifications across multiple platforms';
COMMENT ON COLUMN device_tokens.token IS 'FCM, APNS, or Web Push subscription token';
COMMENT ON COLUMN device_tokens.platform IS 'Device platform: ios, android, or web';
COMMENT ON COLUMN device_tokens.device_info IS 'Additional device information (model, OS version, etc.)';
COMMENT ON COLUMN device_tokens.preferences IS 'User notification preferences for this device';
COMMENT ON COLUMN device_tokens.badge_count IS 'Current badge count for iOS devices';
COMMENT ON COLUMN device_tokens.failure_count IS 'Number of consecutive failed notification attempts';
COMMENT ON COLUMN device_tokens.expires_at IS 'Token expiration date (optional, platform-dependent)';

-- Rollback script (uncomment to rollback)
-- DROP TRIGGER IF EXISTS device_tokens_updated_at ON device_tokens;
-- DROP FUNCTION IF EXISTS update_device_tokens_updated_at();
-- DROP TABLE IF EXISTS device_tokens;
-- DROP TYPE IF EXISTS token_status;
-- DROP TYPE IF EXISTS device_platform;
