-- account_project_api_keys: API key linked to account project with impersonated account role
CREATE TABLE "account_project_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"account_project_id" uuid NOT NULL,
	"account_role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
-- organization_project_api_keys: API key linked to organization project with impersonated organization role
CREATE TABLE "organization_project_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"organization_project_id" uuid NOT NULL,
	"organization_role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
-- account_project_api_keys: unique index and FKs
CREATE UNIQUE INDEX "account_project_api_keys_api_key_account_project_unique" ON "account_project_api_keys" USING btree ("api_key_id","account_project_id") WHERE "account_project_api_keys"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "account_project_api_keys_api_key_id_idx" ON "account_project_api_keys" USING btree ("api_key_id");
--> statement-breakpoint
CREATE INDEX "account_project_api_keys_account_project_id_idx" ON "account_project_api_keys" USING btree ("account_project_id");
--> statement-breakpoint
CREATE INDEX "account_project_api_keys_account_role_id_idx" ON "account_project_api_keys" USING btree ("account_role_id");
--> statement-breakpoint
CREATE INDEX "account_project_api_keys_deleted_at_idx" ON "account_project_api_keys" USING btree ("deleted_at");
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" ADD CONSTRAINT "account_project_api_keys_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" ADD CONSTRAINT "account_project_api_keys_account_project_id_account_projects_id_fk" FOREIGN KEY ("account_project_id") REFERENCES "public"."account_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account_project_api_keys" ADD CONSTRAINT "account_project_api_keys_account_role_id_roles_id_fk" FOREIGN KEY ("account_role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- organization_project_api_keys: unique index and FKs
CREATE UNIQUE INDEX "organization_project_api_keys_api_key_org_project_unique" ON "organization_project_api_keys" USING btree ("api_key_id","organization_project_id") WHERE "organization_project_api_keys"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "organization_project_api_keys_api_key_id_idx" ON "organization_project_api_keys" USING btree ("api_key_id");
--> statement-breakpoint
CREATE INDEX "organization_project_api_keys_organization_project_id_idx" ON "organization_project_api_keys" USING btree ("organization_project_id");
--> statement-breakpoint
CREATE INDEX "organization_project_api_keys_organization_role_id_idx" ON "organization_project_api_keys" USING btree ("organization_role_id");
--> statement-breakpoint
CREATE INDEX "organization_project_api_keys_deleted_at_idx" ON "organization_project_api_keys" USING btree ("deleted_at");
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ADD CONSTRAINT "organization_project_api_keys_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ADD CONSTRAINT "organization_project_api_keys_organization_project_id_organization_projects_id_fk" FOREIGN KEY ("organization_project_id") REFERENCES "public"."organization_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ADD CONSTRAINT "organization_project_api_keys_organization_role_id_roles_id_fk" FOREIGN KEY ("organization_role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
