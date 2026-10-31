CREATE TABLE "api_key_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "api_key_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_project_api_keys" ALTER COLUMN "account_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ALTER COLUMN "organization_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key_permissions" ADD CONSTRAINT "api_key_permissions_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_permissions" ADD CONSTRAINT "api_key_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_permissions" ADD CONSTRAINT "api_key_permissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_permissions_api_key_permission_unique" ON "api_key_permissions" USING btree ("api_key_id","permission_id") WHERE "api_key_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "api_key_permissions_api_key_id_idx" ON "api_key_permissions" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_key_permissions_permission_id_idx" ON "api_key_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "api_key_permissions_project_id_idx" ON "api_key_permissions" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "api_key_permissions" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "api_key_permissions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);