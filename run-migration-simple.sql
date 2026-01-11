ALTER TABLE processes ADD COLUMN IF NOT EXISTS lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL AFTER updatedAt;
CREATE INDEX IF NOT EXISTS idx_process_number_user ON processes(userId, processNumber(50));
CREATE INDEX IF NOT EXISTS idx_process_last_activity ON processes(userId, lastActivityAt DESC);
