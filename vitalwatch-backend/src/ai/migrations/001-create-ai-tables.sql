-- Migration: Create AI Conversation and Message tables
-- Date: 2024-02-06
-- Description: Create tables for AI conversation history and streaming support

-- Create enum types
CREATE TYPE ai_conversation_type AS ENUM (
  'general_chat',
  'vital_analysis',
  'patient_insight',
  'health_summary',
  'alert_recommendation',
  'clinical_decision'
);

CREATE TYPE ai_message_role AS ENUM (
  'user',
  'assistant',
  'system'
);

CREATE TYPE ai_message_status AS ENUM (
  'pending',
  'streaming',
  'completed',
  'failed',
  'stopped'
);

-- Create ai_conversations table
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  type ai_conversation_type DEFAULT 'general_chat',
  context TEXT,
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 6) DEFAULT 0,
  last_message_id UUID,
  last_message_preview TEXT,
  last_message_at TIMESTAMP,
  model VARCHAR(100) DEFAULT 'gpt-4',
  system_prompt TEXT,
  summary TEXT,
  summarized_at TIMESTAMP,
  tags TEXT[],
  patient_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES users(id),
  vital_reading_id UUID,
  alert_id UUID,
  shared_with_provider BOOLEAN DEFAULT FALSE,
  shared_with_user_ids TEXT[],
  contains_phi BOOLEAN DEFAULT FALSE,
  hipaa_compliant BOOLEAN DEFAULT TRUE,
  content_filtered BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  pinned BOOLEAN DEFAULT FALSE,
  settings JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create ai_messages table
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role ai_message_role NOT NULL,
  content TEXT NOT NULL,
  status ai_message_status DEFAULT 'completed',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  model VARCHAR(100),
  stream_started_at TIMESTAMP,
  stream_completed_at TIMESTAMP,
  stream_chunks INTEGER DEFAULT 0,
  response_time INTEGER,
  content_filtered BOOLEAN DEFAULT FALSE,
  content_filter_flags TEXT[],
  contains_phi BOOLEAN DEFAULT FALSE,
  function_call JSONB,
  tool_calls JSONB,
  error TEXT,
  error_code VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,

  CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- Create indexes for better query performance

-- Conversations indexes
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_user_created ON ai_conversations(user_id, created_at DESC);
CREATE INDEX idx_ai_conversations_type ON ai_conversations(type);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX idx_ai_conversations_last_message_at ON ai_conversations(last_message_at DESC);
CREATE INDEX idx_ai_conversations_patient_id ON ai_conversations(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX idx_ai_conversations_provider_id ON ai_conversations(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_ai_conversations_tags ON ai_conversations USING GIN(tags);
CREATE INDEX idx_ai_conversations_archived ON ai_conversations(archived) WHERE archived = FALSE;
CREATE INDEX idx_ai_conversations_pinned ON ai_conversations(pinned) WHERE pinned = TRUE;
CREATE INDEX idx_ai_conversations_deleted ON ai_conversations(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index on conversations
CREATE INDEX idx_ai_conversations_title_search ON ai_conversations USING GIN(to_tsvector('english', title));
CREATE INDEX idx_ai_conversations_context_search ON ai_conversations USING GIN(to_tsvector('english', COALESCE(context, '')));

-- Messages indexes
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_conversation_created ON ai_messages(conversation_id, created_at ASC);
CREATE INDEX idx_ai_messages_role ON ai_messages(role);
CREATE INDEX idx_ai_messages_status ON ai_messages(status);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at DESC);

-- Full-text search index on messages
CREATE INDEX idx_ai_messages_content_search ON ai_messages USING GIN(to_tsvector('english', content));

-- Composite indexes for common queries
CREATE INDEX idx_ai_conversations_user_type_created ON ai_conversations(user_id, type, created_at DESC);
CREATE INDEX idx_ai_messages_conversation_role_created ON ai_messages(conversation_id, role, created_at ASC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER trigger_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversation_updated_at();

-- Create function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET
    last_message_id = NEW.id,
    last_message_preview = SUBSTRING(NEW.content, 1, 200),
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating conversation last message
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Add comments for documentation
COMMENT ON TABLE ai_conversations IS 'Stores AI conversation sessions with metadata and settings';
COMMENT ON TABLE ai_messages IS 'Stores individual messages within AI conversations';

COMMENT ON COLUMN ai_conversations.contains_phi IS 'Flag indicating if conversation contains Protected Health Information';
COMMENT ON COLUMN ai_conversations.hipaa_compliant IS 'Flag indicating HIPAA compliance status';
COMMENT ON COLUMN ai_conversations.total_cost IS 'Total cost in USD for this conversation';
COMMENT ON COLUMN ai_conversations.total_tokens IS 'Total tokens used in this conversation';

COMMENT ON COLUMN ai_messages.response_time IS 'Response time in milliseconds';
COMMENT ON COLUMN ai_messages.cost IS 'Cost in USD for this message';
COMMENT ON COLUMN ai_messages.stream_chunks IS 'Number of chunks received during streaming';

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE ON ai_conversations TO vitalwatch_app;
-- GRANT SELECT, INSERT, UPDATE ON ai_messages TO vitalwatch_app;

-- Sample data for testing (optional - remove in production)
-- INSERT INTO ai_conversations (user_id, title, type, model)
-- SELECT id, 'Welcome to VitalWatch AI', 'general_chat', 'gpt-4'
-- FROM users
-- WHERE role = 'patient'
-- LIMIT 1;
