-- CloudBase RDB user profile table.
-- Create this table once in the CloudBase RDB SQL console.
-- Then set the table permission to PRIVATE (read and write own data only).

CREATE TABLE IF NOT EXISTS user_profile (
  id BIGINT NOT NULL AUTO_INCREMENT,
  nickname VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  PRIMARY KEY (id)
);
