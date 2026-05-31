\c notes_db;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    name        VARCHAR(255) NOT NULL,
    parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);

CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    folder_id       UUID REFERENCES folders(id) ON DELETE SET NULL,
    title           VARCHAR(500) NOT NULL DEFAULT 'Untitled',
    type            VARCHAR(20) NOT NULL DEFAULT 'markdown',
    content         TEXT,
    version         INTEGER DEFAULT 1,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    search_vector   TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(
            CASE WHEN type = 'markdown' THEN content ELSE '' END, ''
        )), 'B')
    ) STORED
);

CREATE INDEX idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX idx_notes_user ON notes(user_id, updated_at DESC);
CREATE INDEX idx_notes_folder ON notes(folder_id);
CREATE INDEX idx_notes_deleted ON notes(user_id, is_deleted);

CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    storage_key     TEXT NOT NULL,
    thumbnail_key   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_note ON attachments(note_id);
CREATE INDEX idx_attachments_user ON attachments(user_id);
