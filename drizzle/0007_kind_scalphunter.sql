CREATE TABLE `monthly_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`month` text NOT NULL,
	`number` integer NOT NULL,
	`date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `study_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_sessions_group_month_number` ON `monthly_sessions` (`group_id`,`month`,`number`);--> statement-breakpoint
CREATE INDEX `monthly_sessions_group_month` ON `monthly_sessions` (`group_id`,`month`);--> statement-breakpoint
ALTER TABLE `study_groups` ADD `sessions_per_month` integer;