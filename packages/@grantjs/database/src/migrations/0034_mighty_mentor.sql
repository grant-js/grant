ALTER TABLE "account_project_api_key_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "account_project_api_key_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "account_project_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "account_project_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "account_project_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "account_project_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "account_role_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "account_role_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "account_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "account_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "account_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "account_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "group_permission_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "group_permission_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "group_tags_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "group_tags_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "group_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "group_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_groups_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_groups_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_invitation_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_invitation_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_permissions_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_permissions_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_project_api_key_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_project_api_key_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_projects_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_projects_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_role_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_role_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_user_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_user_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "permission_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "permission_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "permission_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "permission_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_group_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_group_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_permission_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_permission_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_resource_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_resource_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_role_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_role_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_user_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_user_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "project_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "resource_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "resource_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "role_groups_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "role_groups_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "role_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "role_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "role_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "role_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "user_authentication_method_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "user_authentication_method_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "user_role_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "user_role_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "user_session_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "user_session_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "user_tags_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "user_tags_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "user_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "user_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_project_tag_audit_logs" ADD COLUMN "scope_tenant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_project_tag_audit_logs" ADD COLUMN "scope_id" varchar(255);--> statement-breakpoint
CREATE INDEX "account_project_api_key_audit_logs_scope_tenant_idx" ON "account_project_api_key_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "account_project_tag_audit_logs_scope_tenant_idx" ON "account_project_tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "account_project_audit_logs_scope_tenant_idx" ON "account_project_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "account_role_audit_logs_scope_tenant_idx" ON "account_role_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "account_tag_audit_logs_scope_tenant_idx" ON "account_tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "account_audit_logs_scope_tenant_idx" ON "account_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "api_key_audit_logs_scope_tenant_idx" ON "api_key_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "group_permission_audit_logs_scope_tenant_idx" ON "group_permission_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "group_tags_audit_logs_scope_tenant_idx" ON "group_tags_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "group_audit_logs_scope_tenant_idx" ON "group_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_groups_audit_logs_scope_tenant_idx" ON "organization_groups_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_invitation_audit_logs_scope_tenant_idx" ON "organization_invitation_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_permissions_audit_logs_scope_tenant_idx" ON "organization_permissions_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_project_api_key_audit_logs_scope_tenant_idx" ON "organization_project_api_key_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_projects_audit_logs_scope_tenant_idx" ON "organization_projects_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_role_audit_logs_scope_tenant_idx" ON "organization_role_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_tag_audit_logs_scope_tenant_idx" ON "organization_tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_user_audit_logs_scope_tenant_idx" ON "organization_user_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_audit_logs_scope_tenant_idx" ON "organization_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "permission_tag_audit_logs_scope_tenant_idx" ON "permission_tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "permission_audit_logs_scope_tenant_idx" ON "permission_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_group_audit_logs_scope_tenant_idx" ON "project_group_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_permission_audit_logs_scope_tenant_idx" ON "project_permission_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_resource_audit_logs_scope_tenant_idx" ON "project_resource_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_role_audit_logs_scope_tenant_idx" ON "project_role_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_tag_audit_logs_scope_tenant_idx" ON "project_tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_user_api_key_audit_logs_scope_tenant_idx" ON "project_user_api_key_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_user_audit_logs_scope_tenant_idx" ON "project_user_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_audit_logs_scope_tenant_idx" ON "project_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "resource_tag_audit_logs_scope_tenant_idx" ON "resource_tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "resource_audit_logs_scope_tenant_idx" ON "resource_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "role_groups_audit_logs_scope_tenant_idx" ON "role_groups_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "role_tag_audit_logs_scope_tenant_idx" ON "role_tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "role_audit_logs_scope_tenant_idx" ON "role_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "tag_audit_logs_scope_tenant_idx" ON "tag_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "user_auth_method_audit_logs_scope_tenant_idx" ON "user_authentication_method_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "user_role_audit_logs_scope_tenant_idx" ON "user_role_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "user_session_audit_logs_scope_tenant_idx" ON "user_session_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "user_tags_audit_logs_scope_tenant_idx" ON "user_tags_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "user_audit_logs_scope_tenant_idx" ON "user_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "organization_project_tag_audit_logs_scope_tenant_idx" ON "organization_project_tag_audit_logs" USING btree ("scope_tenant");