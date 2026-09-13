ALTER TABLE "organizations" ADD COLUMN "picture_path" varchar(1024);--> statement-breakpoint
ALTER TABLE "project_users" ADD COLUMN "picture_path" varchar(1024);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "picture_path" varchar(1024);