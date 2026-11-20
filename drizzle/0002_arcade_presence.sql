CREATE TABLE `arcade_presence` (
	`session_id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`game_id` text,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `arcade_presence_expiry` ON `arcade_presence` (`expires_at`);