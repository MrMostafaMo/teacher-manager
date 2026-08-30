CREATE TABLE `plan_price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`amount` integer NOT NULL,
	`effective_from` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `plan_price_history_plan` ON `plan_price_history` (`plan_id`);
