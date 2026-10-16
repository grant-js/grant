CREATE TABLE "project_password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"auth_method_id" uuid NOT NULL,
	"token_hash" varchar(64),
	"expires_at" timestamp NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_password_resets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_password_resets" ADD CONSTRAINT "project_password_resets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_password_resets" ADD CONSTRAINT "project_password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_password_resets" ADD CONSTRAINT "project_password_resets_auth_method_id_user_authentication_methods_id_fk" FOREIGN KEY ("auth_method_id") REFERENCES "public"."user_authentication_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_password_resets_project_id_user_id_unique" ON "project_password_resets" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_password_resets_token_hash_unique" ON "project_password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "project_password_resets_user_id_idx" ON "project_password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_password_resets_auth_method_id_idx" ON "project_password_resets" USING btree ("auth_method_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_password_resets" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "project_password_resets" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);