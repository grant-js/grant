CREATE TABLE "resource_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "resource_tag_audit_logs" ADD CONSTRAINT "resource_tag_audit_logs_resource_tag_id_resource_tags_id_fk" FOREIGN KEY ("resource_tag_id") REFERENCES "public"."resource_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_tags" ADD CONSTRAINT "resource_tags_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_tags" ADD CONSTRAINT "resource_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_tag_audit_logs_resource_tag_id_idx" ON "resource_tag_audit_logs" USING btree ("resource_tag_id");--> statement-breakpoint
CREATE INDEX "resource_tag_audit_logs_action_idx" ON "resource_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_tags_resource_id_tag_id_unique" ON "resource_tags" USING btree ("resource_id","tag_id") WHERE "resource_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_tags_deleted_at_idx" ON "resource_tags" USING btree ("deleted_at");