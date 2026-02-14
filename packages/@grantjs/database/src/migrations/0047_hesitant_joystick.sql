ALTER POLICY "tenant_isolation_policy" ON "account_project_api_keys" TO public USING (
        NULLIF(current_setting('app.current_account_id', true), '') IS NULL
        OR (account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      );--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "account_project_tags" TO public USING (
        NULLIF(current_setting('app.current_account_id', true), '') IS NULL
        OR (account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      );--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "account_projects" TO public USING (
        NULLIF(current_setting('app.current_account_id', true), '') IS NULL
        OR (account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      );--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "account_roles" TO public USING (NULLIF(current_setting('app.current_account_id', true), '') IS NULL OR account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "account_tags" TO public USING (NULLIF(current_setting('app.current_account_id', true), '') IS NULL OR account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_groups" TO public USING (NULLIF(current_setting('app.current_organization_id', true), '') IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_invitations" TO public USING (NULLIF(current_setting('app.current_organization_id', true), '') IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_permissions" TO public USING (NULLIF(current_setting('app.current_organization_id', true), '') IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_project_api_keys" TO public USING (
        NULLIF(current_setting('app.current_organization_id', true), '') IS NULL
        OR (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      );--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_project_tags" TO public USING (
        NULLIF(current_setting('app.current_organization_id', true), '') IS NULL
        OR (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      );--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_projects" TO public USING (
        NULLIF(current_setting('app.current_organization_id', true), '') IS NULL
        OR (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      );--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_roles" TO public USING (NULLIF(current_setting('app.current_organization_id', true), '') IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_tags" TO public USING (NULLIF(current_setting('app.current_organization_id', true), '') IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "organization_users" TO public USING (NULLIF(current_setting('app.current_organization_id', true), '') IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "project_groups" TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "project_permissions" TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "project_resources" TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "project_roles" TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "project_tags" TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "project_user_api_keys" TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
ALTER POLICY "tenant_isolation_policy" ON "project_users" TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);