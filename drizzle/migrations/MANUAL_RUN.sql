-- Manual migration commands
-- Copy and paste these into your MySQL client or run via db.execute()

-- 1. Add lastActivityAt column
ALTER TABLE processes 
ADD COLUMN lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
AFTER updatedAt;

-- 2. Create index for duplicate detection  
CREATE INDEX idx_process_number_user 
ON processes(userId, processNumber(50));

-- 3. Create index for activity timeline
CREATE INDEX idx_process_last_activity 
ON processes(userId, lastActivityAt DESC);
