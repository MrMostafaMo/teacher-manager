ALTER TABLE students ADD COLUMN is_exempt INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE students ADD COLUMN exempt_reason TEXT;
ALTER TABLE students ADD COLUMN exempt_note TEXT;
ALTER TABLE study_groups ADD COLUMN sessions_per_cycle INTEGER;
ALTER TABLE study_groups ADD COLUMN warning_at INTEGER;
