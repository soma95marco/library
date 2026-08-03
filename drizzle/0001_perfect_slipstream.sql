CREATE TABLE `books` (
	`id` varchar(32) NOT NULL,
	`title` varchar(512) NOT NULL,
	`authors` json NOT NULL,
	`cover_url` varchar(1024),
	`metadata` json,
	`fetched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `books` (`id`, `title`, `authors`, `cover_url`, `metadata`)
SELECT `book_id`, MAX(`book_title`), MAX(`book_authors`), MAX(`book_cover_url`), MAX(`book_metadata`)
FROM `reviews`
WHERE `book_title` IS NOT NULL
GROUP BY `book_id`;--> statement-breakpoint
ALTER TABLE `reviews` DROP COLUMN `book_title`;--> statement-breakpoint
ALTER TABLE `reviews` DROP COLUMN `book_authors`;--> statement-breakpoint
ALTER TABLE `reviews` DROP COLUMN `book_cover_url`;--> statement-breakpoint
ALTER TABLE `reviews` DROP COLUMN `book_metadata`;