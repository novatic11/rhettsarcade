CREATE TABLE `save_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `save_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `save_vaults`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `save_vaults` (
	`id` text PRIMARY KEY NOT NULL,
	`password_key` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `save_vaults_password_key_unique` ON `save_vaults` (`password_key`);