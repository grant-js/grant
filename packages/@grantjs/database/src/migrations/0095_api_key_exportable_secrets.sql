CREATE TABLE "api_key_exportable_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"encrypted_secret" varchar(4000) NOT NULL,
	"secret_iv" varchar(255) NOT NULL,
	"secret_tag" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_key_exportable_secrets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "client_secret_fingerprint" varchar(64);--> statement-breakpoint
ALTER TABLE "api_key_exportable_secrets" ADD CONSTRAINT "api_key_exportable_secrets_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_exportable_secrets" ADD CONSTRAINT "api_key_exportable_secrets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_exportable_secrets_api_key_id_unique" ON "api_key_exportable_secrets" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_key_exportable_secrets_project_id_idx" ON "api_key_exportable_secrets" USING btree ("project_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "api_key_exportable_secrets" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "api_key_exportable_secrets" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);