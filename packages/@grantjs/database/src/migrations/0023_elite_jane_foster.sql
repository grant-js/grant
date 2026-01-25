CREATE TABLE "organization_project_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_project_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_project_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "organization_project_tag_audit_logs" ADD CONSTRAINT "organization_project_tag_audit_logs_organization_project_tag_id_organization_project_tags_id_fk" FOREIGN KEY ("organization_project_tag_id") REFERENCES "public"."organization_project_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_project_tags" ADD CONSTRAINT "organization_project_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_project_tags" ADD CONSTRAINT "organization_project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_project_tags" ADD CONSTRAINT "organization_project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_project_tag_audit_logs_organization_project_tag_id_idx" ON "organization_project_tag_audit_logs" USING btree ("organization_project_tag_id");--> statement-breakpoint
CREATE INDEX "organization_project_tag_audit_logs_action_idx" ON "organization_project_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_project_tags_organization_id_project_id_tag_id_unique" ON "organization_project_tags" USING btree ("organization_id","project_id","tag_id") WHERE "organization_project_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_project_tags_deleted_at_idx" ON "organization_project_tags" USING btree ("deleted_at");