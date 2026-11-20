CREATE TABLE `arcade_request_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_key` text NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`seen_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `arcade_request_events_event_key_unique` ON `arcade_request_events` (`event_key`);--> statement-breakpoint
CREATE INDEX `arcade_request_events_thread` ON `arcade_request_events` (`request_id`,`id`);--> statement-breakpoint
CREATE INDEX `arcade_request_events_unseen` ON `arcade_request_events` (`request_id`,`seen_at`);