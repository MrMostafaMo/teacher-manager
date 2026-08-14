CREATE TABLE `weak_points` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`description` text NOT NULL,
	`recorded_on` integer NOT NULL,
	`resolved` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `weak_points_student` ON `weak_points` (`student_id`);