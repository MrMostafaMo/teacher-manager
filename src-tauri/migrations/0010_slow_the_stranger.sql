ALTER TABLE `students` ADD `enrolled_on` text;
UPDATE `students` SET `enrolled_on` = strftime('%Y-%m-%d', `created_at` / 1000, 'unixepoch') WHERE `enrolled_on` IS NULL;
