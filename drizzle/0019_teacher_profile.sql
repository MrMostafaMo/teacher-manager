CREATE TABLE `teacher_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER `trg_sync_teacher_profile` AFTER DELETE ON `teacher_profile` BEGIN INSERT INTO sync_tombstones (id, table_name, row_id, deleted_at, created_at, updated_at) VALUES (lower(hex(randomblob(16))), 'teacher_profile', OLD.id, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)); END;
