-- Migration: Add process activity tracking
-- Created: 2026-01-10
-- Description: Adds lastActivityAt column to track when process was last worked on

ALTER TABLE processes 
ADD COLUMN lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
AFTER updatedAt;

-- Create index for faster duplicate detection
CREATE INDEX idx_process_number_user 
ON processes(userId, processNumber(50));

-- Add index for activity timeline queries
CREATE INDEX idx_process_last_activity 
ON processes(userId, lastActivityAt DESC);
