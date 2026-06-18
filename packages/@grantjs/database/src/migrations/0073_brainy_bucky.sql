DROP INDEX "account_project_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "account_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "group_permissions_deleted_at_idx";--> statement-breakpoint
DROP INDEX "organization_invitations_deleted_at_idx";--> statement-breakpoint
DROP INDEX "organization_project_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "organization_projects_deleted_at_idx";--> statement-breakpoint
DROP INDEX "organization_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "organization_users_deleted_at_idx";--> statement-breakpoint
DROP INDEX "permission_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "project_app_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "project_groups_deleted_at_idx";--> statement-breakpoint
DROP INDEX "project_resources_deleted_at_idx";--> statement-breakpoint
DROP INDEX "project_role_permissions_deleted_at_idx";--> statement-breakpoint
DROP INDEX "project_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "project_user_groups_deleted_at_idx";--> statement-breakpoint
DROP INDEX "project_user_permissions_deleted_at_idx";--> statement-breakpoint
DROP INDEX "resource_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "role_groups_deleted_at_idx";--> statement-breakpoint
DROP INDEX "role_permissions_deleted_at_idx";--> statement-breakpoint
DROP INDEX "role_tags_deleted_at_idx";--> statement-breakpoint
DROP INDEX "user_groups_deleted_at_idx";--> statement-breakpoint
DROP INDEX "user_permissions_deleted_at_idx";--> statement-breakpoint
DROP INDEX "user_tags_deleted_at_idx";--> statement-breakpoint
CREATE INDEX "account_project_tags_deleted_at_idx" ON "account_project_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "account_tags_deleted_at_idx" ON "account_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "group_permissions_deleted_at_idx" ON "group_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_invitations_deleted_at_idx" ON "organization_invitations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_project_tags_deleted_at_idx" ON "organization_project_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_projects_deleted_at_idx" ON "organization_projects" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_tags_deleted_at_idx" ON "organization_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_users_deleted_at_idx" ON "organization_users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "permission_tags_deleted_at_idx" ON "permission_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_app_tags_deleted_at_idx" ON "project_app_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_groups_deleted_at_idx" ON "project_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_resources_deleted_at_idx" ON "project_resources" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_role_permissions_deleted_at_idx" ON "project_role_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_tags_deleted_at_idx" ON "project_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_user_groups_deleted_at_idx" ON "project_user_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_user_permissions_deleted_at_idx" ON "project_user_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "resource_tags_deleted_at_idx" ON "resource_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "role_groups_deleted_at_idx" ON "role_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "role_permissions_deleted_at_idx" ON "role_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "role_tags_deleted_at_idx" ON "role_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_groups_deleted_at_idx" ON "user_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_permissions_deleted_at_idx" ON "user_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_tags_deleted_at_idx" ON "user_tags" USING btree ("deleted_at");