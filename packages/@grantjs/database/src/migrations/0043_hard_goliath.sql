ALTER TABLE "account_project_api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_project_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_project_api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_project_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_user_api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_project_api_keys" AS PERMISSIVE FOR ALL TO public USING (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      ) WITH CHECK (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_project_tags" AS PERMISSIVE FOR ALL TO public USING (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      ) WITH CHECK (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_projects" AS PERMISSIVE FOR ALL TO public USING (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      ) WITH CHECK (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_roles" AS PERMISSIVE FOR ALL TO public USING (account_id = current_setting('app.current_account_id', true)::uuid) WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_tags" AS PERMISSIVE FOR ALL TO public USING (account_id = current_setting('app.current_account_id', true)::uuid) WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_groups" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_invitations" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_permissions" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_project_api_keys" AS PERMISSIVE FOR ALL TO public USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      ) WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_projects" AS PERMISSIVE FOR ALL TO public USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      ) WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_roles" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_tags" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_users" AS PERMISSIVE FOR ALL TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_groups" AS PERMISSIVE FOR ALL TO public USING (project_id = current_setting('app.current_project_id', true)::uuid) WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_permissions" AS PERMISSIVE FOR ALL TO public USING (project_id = current_setting('app.current_project_id', true)::uuid) WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_resources" AS PERMISSIVE FOR ALL TO public USING (project_id = current_setting('app.current_project_id', true)::uuid) WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_roles" AS PERMISSIVE FOR ALL TO public USING (project_id = current_setting('app.current_project_id', true)::uuid) WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_tags" AS PERMISSIVE FOR ALL TO public USING (project_id = current_setting('app.current_project_id', true)::uuid) WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_user_api_keys" AS PERMISSIVE FOR ALL TO public USING (project_id = current_setting('app.current_project_id', true)::uuid) WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_users" AS PERMISSIVE FOR ALL TO public USING (project_id = current_setting('app.current_project_id', true)::uuid) WITH CHECK (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_project_tags" AS PERMISSIVE FOR ALL TO public USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      ) WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );