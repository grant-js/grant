ALTER TABLE "account_project_tag_audit_logs" DROP CONSTRAINT "account_project_tag_audit_logs_account_project_tag_id_account_project_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "account_project_audit_logs" DROP CONSTRAINT "account_project_audit_logs_account_project_id_account_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "account_role_audit_logs" DROP CONSTRAINT "account_role_audit_logs_account_role_id_account_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "account_tag_audit_logs" DROP CONSTRAINT "account_tag_audit_logs_account_tag_id_account_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "group_permission_audit_logs" DROP CONSTRAINT "group_permission_audit_logs_group_permission_id_group_permissions_id_fk";
--> statement-breakpoint
ALTER TABLE "group_audit_logs" DROP CONSTRAINT "group_audit_logs_group_id_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_invitation_audit_logs" DROP CONSTRAINT "organization_invitation_audit_logs_organization_invitation_id_organization_invitations_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_role_audit_logs" DROP CONSTRAINT "organization_role_audit_logs_organization_role_id_organization_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_tag_audit_logs" DROP CONSTRAINT "organization_tag_audit_logs_organization_tag_id_organization_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_user_audit_logs" DROP CONSTRAINT "organization_user_audit_logs_organization_user_id_organization_users_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_audit_logs" DROP CONSTRAINT "organization_audit_logs_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "permission_tag_audit_logs" DROP CONSTRAINT "permission_tag_audit_logs_permission_tag_id_permission_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "permission_audit_logs" DROP CONSTRAINT "permission_audit_logs_permission_id_permissions_id_fk";
--> statement-breakpoint
ALTER TABLE "project_group_audit_logs" DROP CONSTRAINT "project_group_audit_logs_project_group_id_project_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "project_permission_audit_logs" DROP CONSTRAINT "project_permission_audit_logs_project_permission_id_project_permissions_id_fk";
--> statement-breakpoint
ALTER TABLE "project_resource_audit_logs" DROP CONSTRAINT "project_resource_audit_logs_project_resource_id_project_resources_id_fk";
--> statement-breakpoint
ALTER TABLE "project_role_audit_logs" DROP CONSTRAINT "project_role_audit_logs_project_role_id_project_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "project_tag_audit_logs" DROP CONSTRAINT "project_tag_audit_logs_project_tag_id_project_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "project_user_audit_logs" DROP CONSTRAINT "project_user_audit_logs_project_user_id_project_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_audit_logs" DROP CONSTRAINT "project_audit_logs_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_tag_audit_logs" DROP CONSTRAINT "resource_tag_audit_logs_resource_tag_id_resource_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_audit_logs" DROP CONSTRAINT "resource_audit_logs_resource_id_resources_id_fk";
--> statement-breakpoint
ALTER TABLE "role_tag_audit_logs" DROP CONSTRAINT "role_tag_audit_logs_role_tag_id_role_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "role_audit_logs" DROP CONSTRAINT "role_audit_logs_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "tag_audit_logs" DROP CONSTRAINT "tag_audit_logs_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "user_authentication_method_audit_logs" DROP CONSTRAINT "user_authentication_method_audit_logs_user_authentication_method_id_user_authentication_methods_id_fk";
--> statement-breakpoint
ALTER TABLE "user_role_audit_logs" DROP CONSTRAINT "user_role_audit_logs_user_role_id_user_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "user_session_audit_logs" DROP CONSTRAINT "user_session_audit_logs_user_session_id_user_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_project_tag_audit_logs" DROP CONSTRAINT "organization_project_tag_audit_logs_organization_project_tag_id_organization_project_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "account_project_tag_audit_logs" ALTER COLUMN "account_project_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "account_project_audit_logs" ALTER COLUMN "account_project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "account_role_audit_logs" ALTER COLUMN "account_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "account_tag_audit_logs" ALTER COLUMN "account_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "group_permission_audit_logs" ALTER COLUMN "group_permission_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "group_audit_logs" ALTER COLUMN "group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_invitation_audit_logs" ALTER COLUMN "organization_invitation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_role_audit_logs" ALTER COLUMN "organization_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_tag_audit_logs" ALTER COLUMN "organization_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_user_audit_logs" ALTER COLUMN "organization_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_audit_logs" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "permission_tag_audit_logs" ALTER COLUMN "permission_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "permission_audit_logs" ALTER COLUMN "permission_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_group_audit_logs" ALTER COLUMN "project_group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_permission_audit_logs" ALTER COLUMN "project_permission_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_resource_audit_logs" ALTER COLUMN "project_resource_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_role_audit_logs" ALTER COLUMN "project_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_tag_audit_logs" ALTER COLUMN "project_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_user_audit_logs" ALTER COLUMN "project_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_audit_logs" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_tag_audit_logs" ALTER COLUMN "resource_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ALTER COLUMN "resource_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "role_tag_audit_logs" ALTER COLUMN "role_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "role_audit_logs" ALTER COLUMN "role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tag_audit_logs" ALTER COLUMN "tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_authentication_method_audit_logs" ALTER COLUMN "user_authentication_method_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_role_audit_logs" ALTER COLUMN "user_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_session_audit_logs" ALTER COLUMN "user_session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_project_tag_audit_logs" ALTER COLUMN "organization_project_tag_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "account_project_tag_audit_logs" ADD CONSTRAINT "account_project_tag_audit_logs_account_project_tag_id_account_project_tags_id_fk" FOREIGN KEY ("account_project_tag_id") REFERENCES "public"."account_project_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_project_audit_logs" ADD CONSTRAINT "account_project_audit_logs_account_project_id_account_projects_id_fk" FOREIGN KEY ("account_project_id") REFERENCES "public"."account_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_role_audit_logs" ADD CONSTRAINT "account_role_audit_logs_account_role_id_account_roles_id_fk" FOREIGN KEY ("account_role_id") REFERENCES "public"."account_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tag_audit_logs" ADD CONSTRAINT "account_tag_audit_logs_account_tag_id_account_tags_id_fk" FOREIGN KEY ("account_tag_id") REFERENCES "public"."account_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_permission_audit_logs" ADD CONSTRAINT "group_permission_audit_logs_group_permission_id_group_permissions_id_fk" FOREIGN KEY ("group_permission_id") REFERENCES "public"."group_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audit_logs" ADD CONSTRAINT "group_audit_logs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitation_audit_logs" ADD CONSTRAINT "organization_invitation_audit_logs_organization_invitation_id_organization_invitations_id_fk" FOREIGN KEY ("organization_invitation_id") REFERENCES "public"."organization_invitations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_role_audit_logs" ADD CONSTRAINT "organization_role_audit_logs_organization_role_id_organization_roles_id_fk" FOREIGN KEY ("organization_role_id") REFERENCES "public"."organization_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_tag_audit_logs" ADD CONSTRAINT "organization_tag_audit_logs_organization_tag_id_organization_tags_id_fk" FOREIGN KEY ("organization_tag_id") REFERENCES "public"."organization_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_audit_logs" ADD CONSTRAINT "organization_user_audit_logs_organization_user_id_organization_users_id_fk" FOREIGN KEY ("organization_user_id") REFERENCES "public"."organization_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_audit_logs" ADD CONSTRAINT "organization_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_tag_audit_logs" ADD CONSTRAINT "permission_tag_audit_logs_permission_tag_id_permission_tags_id_fk" FOREIGN KEY ("permission_tag_id") REFERENCES "public"."permission_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_audit_logs" ADD CONSTRAINT "permission_audit_logs_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_group_audit_logs" ADD CONSTRAINT "project_group_audit_logs_project_group_id_project_groups_id_fk" FOREIGN KEY ("project_group_id") REFERENCES "public"."project_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_permission_audit_logs" ADD CONSTRAINT "project_permission_audit_logs_project_permission_id_project_permissions_id_fk" FOREIGN KEY ("project_permission_id") REFERENCES "public"."project_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resource_audit_logs" ADD CONSTRAINT "project_resource_audit_logs_project_resource_id_project_resources_id_fk" FOREIGN KEY ("project_resource_id") REFERENCES "public"."project_resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_audit_logs" ADD CONSTRAINT "project_role_audit_logs_project_role_id_project_roles_id_fk" FOREIGN KEY ("project_role_id") REFERENCES "public"."project_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tag_audit_logs" ADD CONSTRAINT "project_tag_audit_logs_project_tag_id_project_tags_id_fk" FOREIGN KEY ("project_tag_id") REFERENCES "public"."project_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_audit_logs" ADD CONSTRAINT "project_user_audit_logs_project_user_id_project_users_id_fk" FOREIGN KEY ("project_user_id") REFERENCES "public"."project_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_audit_logs" ADD CONSTRAINT "project_audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_tag_audit_logs" ADD CONSTRAINT "resource_tag_audit_logs_resource_tag_id_resource_tags_id_fk" FOREIGN KEY ("resource_tag_id") REFERENCES "public"."resource_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD CONSTRAINT "resource_audit_logs_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_tag_audit_logs" ADD CONSTRAINT "role_tag_audit_logs_role_tag_id_role_tags_id_fk" FOREIGN KEY ("role_tag_id") REFERENCES "public"."role_tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_audit_logs" ADD CONSTRAINT "role_audit_logs_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_audit_logs" ADD CONSTRAINT "tag_audit_logs_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_authentication_method_audit_logs" ADD CONSTRAINT "user_authentication_method_audit_logs_user_authentication_method_id_user_authentication_methods_id_fk" FOREIGN KEY ("user_authentication_method_id") REFERENCES "public"."user_authentication_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_audit_logs" ADD CONSTRAINT "user_role_audit_logs_user_role_id_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_audit_logs" ADD CONSTRAINT "user_session_audit_logs_user_session_id_user_sessions_id_fk" FOREIGN KEY ("user_session_id") REFERENCES "public"."user_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_project_tag_audit_logs" ADD CONSTRAINT "organization_project_tag_audit_logs_organization_project_tag_id_organization_project_tags_id_fk" FOREIGN KEY ("organization_project_tag_id") REFERENCES "public"."organization_project_tags"("id") ON DELETE set null ON UPDATE no action;