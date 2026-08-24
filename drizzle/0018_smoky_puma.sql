ALTER TABLE students ADD COLUMN is_exempt INTEGER DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE students ADD COLUMN exempt_reason TEXT;
--> statement-breakpoint
ALTER TABLE students ADD COLUMN exempt_note TEXT;
--> statement-breakpoint
ALTER TABLE study_groups ADD COLUMN sessions_per_cycle INTEGER;
--> statement-breakpoint
ALTER TABLE study_groups ADD COLUMN warning_at INTEGER;
