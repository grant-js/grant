DROP POLICY "tenant_isolation_policy" ON "account_project_api_keys" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "account_project_tags" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "account_projects" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "account_roles" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "account_tags" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_groups" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_invitations" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_permissions" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_project_api_keys" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_project_tags" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_projects" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_roles" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_tags" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "organization_users" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "project_groups" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "project_permissions" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "project_resources" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "project_roles" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "project_tags" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "project_user_api_keys" CASCADE;--> statement-breakpoint
DROP POLICY "tenant_isolation_policy" ON "project_users" CASCADE;--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_project_api_keys" AS PERMISSIVE FOR SELECT TO public USING (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_project_tags" AS PERMISSIVE FOR SELECT TO public USING (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_projects" AS PERMISSIVE FOR SELECT TO public USING (
        account_id = current_setting('app.current_account_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_roles" AS PERMISSIVE FOR SELECT TO public USING (account_id = current_setting('app.current_account_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "account_tags" AS PERMISSIVE FOR SELECT TO public USING (account_id = current_setting('app.current_account_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_groups" AS PERMISSIVE FOR SELECT TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_invitations" AS PERMISSIVE FOR SELECT TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_permissions" AS PERMISSIVE FOR SELECT TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_project_api_keys" AS PERMISSIVE FOR SELECT TO public USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_project_tags" AS PERMISSIVE FOR SELECT TO public USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_projects" AS PERMISSIVE FOR SELECT TO public USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND (current_setting('app.current_project_id', true) IS NULL
             OR project_id = current_setting('app.current_project_id', true)::uuid)
      );--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_roles" AS PERMISSIVE FOR SELECT TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_tags" AS PERMISSIVE FOR SELECT TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "organization_users" AS PERMISSIVE FOR SELECT TO public USING (organization_id = current_setting('app.current_organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_groups" AS PERMISSIVE FOR SELECT TO public USING (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_permissions" AS PERMISSIVE FOR SELECT TO public USING (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_resources" AS PERMISSIVE FOR SELECT TO public USING (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_roles" AS PERMISSIVE FOR SELECT TO public USING (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_tags" AS PERMISSIVE FOR SELECT TO public USING (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_user_api_keys" AS PERMISSIVE FOR SELECT TO public USING (project_id = current_setting('app.current_project_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_users" AS PERMISSIVE FOR SELECT TO public USING (project_id = current_setting('app.current_project_id', true)::uuid);