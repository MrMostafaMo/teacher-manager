CREATE TABLE `session_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`room` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `group_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `session_exceptions_session` ON `session_exceptions` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_exceptions_session_date` ON `session_exceptions` (`session_id`,`date`);
