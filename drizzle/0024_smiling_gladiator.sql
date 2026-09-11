ALTER TABLE `group_sessions` ADD `one_off_date` text;--> statement-breakpoint
ALTER TABLE `group_sessions` ADD `moved_from_session_id` text;--> statement-breakpoint
ALTER TABLE `group_sessions` ADD `moved_from_date` text;--> statement-breakpoint
CREATE INDEX `group_sessions_one_off_date` ON `group_sessions` (`one_off_date`);