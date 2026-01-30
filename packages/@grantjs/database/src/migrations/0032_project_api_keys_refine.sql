-- account_project_api_keys: add account_id and project_id, backfill from account_projects, drop account_project_id
ALTER TABLE "account_project_api_keys" ADD COLUMN "account_id" uuid;
ALTER TABLE "account_project_api_keys" ADD COLUMN "project_id" uuid;
--> statement-breakpoint
UPDATE "account_project_api_keys" SET "account_id" = ap."account_id", "project_id" = ap."project_id"
FROM "account_projects" ap WHERE ap."id" = "account_project_api_keys"."account_project_id";
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" ALTER COLUMN "account_id" SET NOT NULL;
ALTER TABLE "account_project_api_keys" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" DROP CONSTRAINT "account_project_api_keys_account_project_id_account_projects_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "account_project_api_keys_api_key_account_project_unique";
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" DROP COLUMN "account_project_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "account_project_api_keys_account_project_api_key_unique" ON "account_project_api_keys" USING btree ("account_id","project_id","api_key_id") WHERE "account_project_api_keys"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "account_project_api_keys_account_id_idx" ON "account_project_api_keys" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX "account_project_api_keys_project_id_idx" ON "account_project_api_keys" USING btree ("project_id");
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" ADD CONSTRAINT "account_project_api_keys_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" ADD CONSTRAINT "account_project_api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- organization_project_api_keys: add organization_id and project_id, backfill, drop organization_project_id
ALTER TABLE "organization_project_api_keys" ADD COLUMN "organization_id" uuid;
ALTER TABLE "organization_project_api_keys" ADD COLUMN "project_id" uuid;
--> statement-breakpoint
UPDATE "organization_project_api_keys" SET "organization_id" = op."organization_id", "project_id" = op."project_id"
FROM "organization_projects" op WHERE op."id" = "organization_project_api_keys"."organization_project_id";
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "organization_project_api_keys" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" DROP CONSTRAINT "organization_project_api_keys_organization_project_id_organization_projects_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "organization_project_api_keys_api_key_org_project_unique";
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" DROP COLUMN "organization_project_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_project_api_keys_org_project_api_key_unique" ON "organization_project_api_keys" USING btree ("organization_id","project_id","api_key_id") WHERE "organization_project_api_keys"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "organization_project_api_keys_organization_id_idx" ON "organization_project_api_keys" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "organization_project_api_keys_project_id_idx" ON "organization_project_api_keys" USING btree ("project_id");
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ADD CONSTRAINT "organization_project_api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ADD CONSTRAINT "organization_project_api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- account_project_api_key_audit_logs
CREATE TABLE "account_project_api_key_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_project_api_key_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_project_api_key_audit_logs_account_project_api_key_id_idx" ON "account_project_api_key_audit_logs" USING btree ("account_project_api_key_id");
--> statement-breakpoint
CREATE INDEX "account_project_api_key_audit_logs_action_idx" ON "account_project_api_key_audit_logs" USING btree ("action");
--> statement-breakpoint
ALTER TABLE "account_project_api_key_audit_logs" ADD CONSTRAINT "account_project_api_key_audit_logs_account_project_api_key_id_account_project_api_keys_id_fk" FOREIGN KEY ("account_project_api_key_id") REFERENCES "public"."account_project_api_keys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account_project_api_key_audit_logs" ADD CONSTRAINT "account_project_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- organization_project_api_key_audit_logs
CREATE TABLE "organization_project_api_key_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_project_api_key_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "organization_project_api_key_audit_logs_org_project_api_key_id_idx" ON "organization_project_api_key_audit_logs" USING btree ("organization_project_api_key_id");
--> statement-breakpoint
CREATE INDEX "organization_project_api_key_audit_logs_action_idx" ON "organization_project_api_key_audit_logs" USING btree ("action");
--> statement-breakpoint
ALTER TABLE "organization_project_api_key_audit_logs" ADD CONSTRAINT "organization_project_api_key_audit_logs_organization_project_api_key_id_organization_project_api_keys_id_fk" FOREIGN KEY ("organization_project_api_key_id") REFERENCES "public"."organization_project_api_keys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_project_api_key_audit_logs" ADD CONSTRAINT "organization_project_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
