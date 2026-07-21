-- Add ownership metadata for the "My Questions" filter.
-- Run this once in the CloudBase RDB SQL console.
-- Existing questions are intentionally left without an owner and remain in the
-- full question bank only. New questions receive owner_key automatically.

ALTER TABLE Question
  ADD COLUMN owner_key CHAR(64) NULL,
  ADD INDEX idx_question_owner_created (owner_key, createdAt);
