CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`key` text NOT NULL,
	`details` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`dismissed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `notifications_key_unique` ON `notifications` (`key`);
