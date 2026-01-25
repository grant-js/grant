CREATE TABLE "project_resource_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_resource_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "resource_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" varchar(1000),
	"actions" text[] DEFAULT '{"read","write","delete","update"}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "resource_id" uuid;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "condition" jsonb;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "project_resource_audit_logs" ADD CONSTRAINT "project_resource_audit_logs_project_resource_id_project_resources_id_fk" FOREIGN KEY ("project_resource_id") REFERENCES "public"."project_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD CONSTRAINT "resource_audit_logs_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD CONSTRAINT "resource_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_resource_audit_logs_project_resource_id_idx" ON "project_resource_audit_logs" USING btree ("project_resource_id");--> statement-breakpoint
CREATE INDEX "project_resource_audit_logs_action_idx" ON "project_resource_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "project_resources_project_id_resource_id_unique" ON "project_resources" USING btree ("project_id","resource_id") WHERE "project_resources"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_resources_deleted_at_idx" ON "project_resources" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "resource_audit_logs_resource_id_idx" ON "resource_audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resource_audit_logs_action_idx" ON "resource_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "resource_audit_logs_performed_by_idx" ON "resource_audit_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "resources_slug_idx" ON "resources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "resources_deleted_at_idx" ON "resources" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "resources_is_active_idx" ON "resources" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_metadata_idx" ON "groups" USING gin ("metadata");--> statement-breakpoint
CREATE INDEX "permissions_resource_id_idx" ON "permissions" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "permissions_condition_idx" ON "permissions" USING gin ("condition");--> statement-breakpoint
CREATE INDEX "roles_metadata_idx" ON "roles" USING gin ("metadata");--> statement-breakpoint
CREATE INDEX "users_metadata_idx" ON "users" USING gin ("metadata");