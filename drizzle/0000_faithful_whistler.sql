CREATE TABLE `reviews` (
	`id` char(36) NOT NULL,
	`book_id` varchar(32) NOT NULL,
	`content` text NOT NULL,
	`score` tinyint unsigned NOT NULL,
	`status` enum('pending','ready','failed') NOT NULL DEFAULT 'pending',
	`book_title` varchar(512),
	`book_authors` json,
	`book_cover_url` varchar(1024),
	`book_metadata` json,
	`failure_reason` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
