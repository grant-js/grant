CREATE TABLE "cdm_import_tombstones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" varchar(50) NOT NULL,
	"external_key_fingerprint" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cdm_import_tombstones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cdm_import_tombstones" ADD CONSTRAINT "cdm_import_tombstones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cdm_import_tombstones_project_kind_fingerprint_unique" ON "cdm_import_tombstones" USING btree ("project_id","kind","external_key_fingerprint");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "cdm_import_tombstones" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "cdm_import_tombstones" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);