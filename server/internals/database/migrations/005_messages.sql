CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    calorie_entry_id UUID REFERENCES calories(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT messages_content_not_blank CHECK (BTRIM(content) <> '')
);

CREATE INDEX messages_conversation_created_at_idx
    ON messages (conversation_id, created_at DESC);
