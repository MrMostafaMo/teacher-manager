CREATE TABLE `group_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`room` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `study_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `group_sessions_group` ON `group_sessions` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `group_sessions_group_day_start` ON `group_sessions` (`group_id`,`day_of_week`,`start_time`);
