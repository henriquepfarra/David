ALTER TABLE processes ADD COLUMN lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL AFTER updatedAt;
CREATE INDEX idx_process_number_user ON processes(userId, processNumber(50));
CREATE INDEX idx_process_last_activity ON processes(userId, lastActivityAt DESC);
