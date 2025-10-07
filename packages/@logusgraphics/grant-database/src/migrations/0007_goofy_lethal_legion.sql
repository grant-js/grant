CREATE TABLE "tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "user_roles_user_id_role_id_unique";--> statement-breakpoint
DROP INDEX "user_tags_user_id_tag_id_unique";--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_tags" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tag_audit_logs" ADD CONSTRAINT "tag_audit_logs_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tag_audit_logs_tag_id_idx" ON "tag_audit_logs" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "tag_audit_logs_action_idx" ON "tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_deleted_at_idx" ON "user_roles" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tags_deleted_at_idx" ON "user_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_id_role_id_unique" ON "user_roles" USING btree ("user_id","role_id") WHERE "user_roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_tags_user_id_tag_id_unique" ON "user_tags" USING btree ("user_id","tag_id") WHERE "user_tags"."deleted_at" IS NULL;