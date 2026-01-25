CREATE TABLE "account_project_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_project_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_project_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "account_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account_project_tag_audit_logs" ADD CONSTRAINT "account_project_tag_audit_logs_account_project_tag_id_account_project_tags_id_fk" FOREIGN KEY ("account_project_tag_id") REFERENCES "public"."account_project_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_project_tags" ADD CONSTRAINT "account_project_tags_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_project_tags" ADD CONSTRAINT "account_project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_project_tags" ADD CONSTRAINT "account_project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tag_audit_logs" ADD CONSTRAINT "account_tag_audit_logs_account_tag_id_account_tags_id_fk" FOREIGN KEY ("account_tag_id") REFERENCES "public"."account_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tags" ADD CONSTRAINT "account_tags_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tags" ADD CONSTRAINT "account_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_project_tag_audit_logs_account_project_tag_id_idx" ON "account_project_tag_audit_logs" USING btree ("account_project_tag_id");--> statement-breakpoint
CREATE INDEX "account_project_tag_audit_logs_action_idx" ON "account_project_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "account_project_tags_account_id_project_id_tag_id_unique" ON "account_project_tags" USING btree ("account_id","project_id","tag_id") WHERE "account_project_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_project_tags_deleted_at_idx" ON "account_project_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "account_tag_audit_logs_account_tag_id_idx" ON "account_tag_audit_logs" USING btree ("account_tag_id");--> statement-breakpoint
CREATE INDEX "account_tag_audit_logs_action_idx" ON "account_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "account_tags_account_id_tag_id_unique" ON "account_tags" USING btree ("account_id","tag_id") WHERE "account_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_tags_deleted_at_idx" ON "account_tags" USING btree ("deleted_at");