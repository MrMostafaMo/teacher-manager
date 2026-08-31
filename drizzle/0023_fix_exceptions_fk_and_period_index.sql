-- Fix session_exceptions FK to CASCADE and add payments period index
PRAGMA foreign_keys=off;
CREATE TABLE `__new_session_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`room` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `group_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO `__new_session_exceptions` (`id`, `session_id`, `date`, `type`, `start_time`, `end_time`, `room`, `created_at`, `updated_at`) SELECT `id`, `session_id`, `date`, `type`, `start_time`, `end_time`, `room`, `created_at`, `updated_at` FROM `session_exceptions`;
DROP TABLE `session_exceptions`;
ALTER TABLE `__new_session_exceptions` RENAME TO `session_exceptions`;
CREATE INDEX `session_exceptions_session` ON `session_exceptions` (`session_id`);
CREATE UNIQUE INDEX `session_exceptions_session_date` ON `session_exceptions` (`session_id`, `date`);
PRAGMA foreign_keys=on;
--> statement-breakpoint
CREATE INDEX `payments_period` ON `payments` (`period`);
