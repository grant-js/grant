ALTER TABLE "project_apps" ADD COLUMN "picture_url" varchar(500);--> statement-breakpoint
ALTER TABLE "project_apps" ADD COLUMN "picture_path" varchar(1024);--> statement-breakpoint
ALTER TABLE "project_apps" ADD COLUMN "primary_color" varchar(7);--> statement-breakpoint
ALTER TABLE "project_apps" ADD COLUMN "show_help_panel" boolean;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "picture_url" varchar(500);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "picture_path" varchar(1024);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "primary_color" varchar(7);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "show_help_panel" boolean;