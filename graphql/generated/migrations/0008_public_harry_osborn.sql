CREATE TABLE "group_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "group_permission_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_permission_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "group_tags_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_groups_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_group_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_permissions_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_permission_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_projects_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_project_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_role_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_role_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_user_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "permission_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"action" varchar(255) NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_group_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_group_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_permission_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_permission_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_role_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_role_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_user_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" varchar(1000),
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "role_groups_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_group_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_tag_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_role_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_role_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_roles_audit_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_roles_audit_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "role_audit_logs" ADD COLUMN "performed_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tag_audit_logs" ADD COLUMN "performed_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_tags_audit_logs" ADD COLUMN "performed_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_audit_logs" ADD COLUMN "performed_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "group_permissions" ADD CONSTRAINT "group_permissions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_permissions" ADD CONSTRAINT "group_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_permission_audit_logs" ADD CONSTRAINT "group_permission_audit_logs_group_permission_id_group_permissions_id_fk" FOREIGN KEY ("group_permission_id") REFERENCES "public"."group_permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tags" ADD CONSTRAINT "group_tags_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tags" ADD CONSTRAINT "group_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tags_audit_logs" ADD CONSTRAINT "group_tags_audit_logs_group_tag_id_group_tags_id_fk" FOREIGN KEY ("group_tag_id") REFERENCES "public"."group_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audit_logs" ADD CONSTRAINT "group_audit_logs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_groups" ADD CONSTRAINT "organization_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_groups" ADD CONSTRAINT "organization_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_groups_audit_logs" ADD CONSTRAINT "organization_groups_audit_logs_organization_group_id_organization_groups_id_fk" FOREIGN KEY ("organization_group_id") REFERENCES "public"."organization_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_permissions" ADD CONSTRAINT "organization_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_permissions" ADD CONSTRAINT "organization_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_permissions_audit_logs" ADD CONSTRAINT "organization_permissions_audit_logs_organization_permission_id_organization_permissions_id_fk" FOREIGN KEY ("organization_permission_id") REFERENCES "public"."organization_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_projects" ADD CONSTRAINT "organization_projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_projects" ADD CONSTRAINT "organization_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_projects_audit_logs" ADD CONSTRAINT "organization_projects_audit_logs_organization_project_id_organization_projects_id_fk" FOREIGN KEY ("organization_project_id") REFERENCES "public"."organization_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_roles" ADD CONSTRAINT "organization_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_roles" ADD CONSTRAINT "organization_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_role_audit_logs" ADD CONSTRAINT "organization_role_audit_logs_organization_role_id_organization_roles_id_fk" FOREIGN KEY ("organization_role_id") REFERENCES "public"."organization_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_tag_audit_logs" ADD CONSTRAINT "organization_tag_audit_logs_organization_tag_id_organization_tags_id_fk" FOREIGN KEY ("organization_tag_id") REFERENCES "public"."organization_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_tags" ADD CONSTRAINT "organization_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_tags" ADD CONSTRAINT "organization_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_audit_logs" ADD CONSTRAINT "organization_user_audit_logs_organization_user_id_organization_users_id_fk" FOREIGN KEY ("organization_user_id") REFERENCES "public"."organization_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_audit_logs" ADD CONSTRAINT "organization_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_tag_audit_logs" ADD CONSTRAINT "permission_tag_audit_logs_permission_tag_id_permission_tags_id_fk" FOREIGN KEY ("permission_tag_id") REFERENCES "public"."permission_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_tags" ADD CONSTRAINT "permission_tags_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_tags" ADD CONSTRAINT "permission_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_audit_logs" ADD CONSTRAINT "permission_audit_logs_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_group_audit_logs" ADD CONSTRAINT "project_group_audit_logs_project_group_id_project_groups_id_fk" FOREIGN KEY ("project_group_id") REFERENCES "public"."project_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_groups" ADD CONSTRAINT "project_groups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_groups" ADD CONSTRAINT "project_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_permissions" ADD CONSTRAINT "project_permissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_permissions" ADD CONSTRAINT "project_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_permission_audit_logs" ADD CONSTRAINT "project_permission_audit_logs_project_permission_id_project_permissions_id_fk" FOREIGN KEY ("project_permission_id") REFERENCES "public"."project_permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_audit_logs" ADD CONSTRAINT "project_role_audit_logs_project_role_id_project_roles_id_fk" FOREIGN KEY ("project_role_id") REFERENCES "public"."project_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tag_audit_logs" ADD CONSTRAINT "project_tag_audit_logs_project_tag_id_project_tags_id_fk" FOREIGN KEY ("project_tag_id") REFERENCES "public"."project_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_audit_logs" ADD CONSTRAINT "project_user_audit_logs_project_user_id_project_users_id_fk" FOREIGN KEY ("project_user_id") REFERENCES "public"."project_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_audit_logs" ADD CONSTRAINT "project_audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_groups" ADD CONSTRAINT "role_groups_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_groups" ADD CONSTRAINT "role_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_groups_audit_logs" ADD CONSTRAINT "role_groups_audit_logs_role_group_id_role_groups_id_fk" FOREIGN KEY ("role_group_id") REFERENCES "public"."role_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_tag_audit_logs" ADD CONSTRAINT "role_tag_audit_logs_role_tag_id_role_tags_id_fk" FOREIGN KEY ("role_tag_id") REFERENCES "public"."role_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_tags" ADD CONSTRAINT "role_tags_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_tags" ADD CONSTRAINT "role_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_audit_logs" ADD CONSTRAINT "user_role_audit_logs_user_role_id_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_permissions_group_id_permission_id_unique" ON "group_permissions" USING btree ("group_id","permission_id") WHERE "group_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "group_permissions_deleted_at_idx" ON "group_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "group_permission_audit_logs_group_permission_id_idx" ON "group_permission_audit_logs" USING btree ("group_permission_id");--> statement-breakpoint
CREATE INDEX "group_permission_audit_logs_action_idx" ON "group_permission_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "group_tags_audit_logs_group_tag_id_idx" ON "group_tags_audit_logs" USING btree ("group_tag_id");--> statement-breakpoint
CREATE INDEX "group_tags_audit_logs_action_idx" ON "group_tags_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "group_audit_logs_group_id_idx" ON "group_audit_logs" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_audit_logs_action_idx" ON "group_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "groups_deleted_at_idx" ON "groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_groups_audit_logs_organization_group_id_idx" ON "organization_groups_audit_logs" USING btree ("organization_group_id");--> statement-breakpoint
CREATE INDEX "organization_groups_audit_logs_action_idx" ON "organization_groups_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "organization_permissions_audit_logs_organization_permission_id_idx" ON "organization_permissions_audit_logs" USING btree ("organization_permission_id");--> statement-breakpoint
CREATE INDEX "organization_permissions_audit_logs_action_idx" ON "organization_permissions_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_projects_organization_id_project_id_unique" ON "organization_projects" USING btree ("organization_id","project_id") WHERE "organization_projects"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_projects_deleted_at_idx" ON "organization_projects" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_projects_audit_logs_organization_project_id_idx" ON "organization_projects_audit_logs" USING btree ("organization_project_id");--> statement-breakpoint
CREATE INDEX "organization_projects_audit_logs_action_idx" ON "organization_projects_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_roles_organization_id_role_id_unique" ON "organization_roles" USING btree ("organization_id","role_id") WHERE "organization_roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_roles_deleted_at_idx" ON "organization_roles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_role_audit_logs_organization_role_id_idx" ON "organization_role_audit_logs" USING btree ("organization_role_id");--> statement-breakpoint
CREATE INDEX "organization_role_audit_logs_action_idx" ON "organization_role_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "organization_tag_audit_logs_organization_tag_id_idx" ON "organization_tag_audit_logs" USING btree ("organization_tag_id");--> statement-breakpoint
CREATE INDEX "organization_tag_audit_logs_action_idx" ON "organization_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_tags_organization_id_tag_id_unique" ON "organization_tags" USING btree ("organization_id","tag_id") WHERE "organization_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_tags_deleted_at_idx" ON "organization_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_users_organization_id_user_id_unique" ON "organization_users" USING btree ("organization_id","user_id") WHERE "organization_users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_users_deleted_at_idx" ON "organization_users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_user_audit_logs_organization_user_id_idx" ON "organization_user_audit_logs" USING btree ("organization_user_id");--> statement-breakpoint
CREATE INDEX "organization_user_audit_logs_action_idx" ON "organization_user_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "organization_audit_logs_organization_id_idx" ON "organization_audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_audit_logs_action_idx" ON "organization_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "organizations_deleted_at_idx" ON "organizations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "permission_tag_audit_logs_permission_tag_id_idx" ON "permission_tag_audit_logs" USING btree ("permission_tag_id");--> statement-breakpoint
CREATE INDEX "permission_tag_audit_logs_action_idx" ON "permission_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_tags_permission_id_tag_id_unique" ON "permission_tags" USING btree ("permission_id","tag_id") WHERE "permission_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "permission_tags_deleted_at_idx" ON "permission_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "permission_audit_logs_permission_id_idx" ON "permission_audit_logs" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "permission_audit_logs_action_idx" ON "permission_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "permissions_deleted_at_idx" ON "permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_group_audit_logs_project_group_id_idx" ON "project_group_audit_logs" USING btree ("project_group_id");--> statement-breakpoint
CREATE INDEX "project_group_audit_logs_action_idx" ON "project_group_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "project_groups_project_id_group_id_unique" ON "project_groups" USING btree ("project_id","group_id") WHERE "project_groups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_groups_deleted_at_idx" ON "project_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_permissions_project_id_permission_id_unique" ON "project_permissions" USING btree ("project_id","permission_id") WHERE "project_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_permissions_deleted_at_idx" ON "project_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_permission_audit_logs_project_permission_id_idx" ON "project_permission_audit_logs" USING btree ("project_permission_id");--> statement-breakpoint
CREATE INDEX "project_permission_audit_logs_action_idx" ON "project_permission_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "project_role_audit_logs_project_role_id_idx" ON "project_role_audit_logs" USING btree ("project_role_id");--> statement-breakpoint
CREATE INDEX "project_role_audit_logs_action_idx" ON "project_role_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "project_roles_project_id_role_id_unique" ON "project_roles" USING btree ("project_id","role_id") WHERE "project_roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_roles_deleted_at_idx" ON "project_roles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_tag_audit_logs_project_tag_id_idx" ON "project_tag_audit_logs" USING btree ("project_tag_id");--> statement-breakpoint
CREATE INDEX "project_tag_audit_logs_action_idx" ON "project_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "project_tags_project_id_tag_id_unique" ON "project_tags" USING btree ("project_id","tag_id") WHERE "project_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_tags_deleted_at_idx" ON "project_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_user_audit_logs_project_user_id_idx" ON "project_user_audit_logs" USING btree ("project_user_id");--> statement-breakpoint
CREATE INDEX "project_user_audit_logs_action_idx" ON "project_user_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "project_users_project_id_user_id_unique" ON "project_users" USING btree ("project_id","user_id") WHERE "project_users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_users_deleted_at_idx" ON "project_users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_audit_logs_project_id_idx" ON "project_audit_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_audit_logs_action_idx" ON "project_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "projects_deleted_at_idx" ON "projects" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_groups_role_id_group_id_unique" ON "role_groups" USING btree ("role_id","group_id") WHERE "role_groups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "role_groups_deleted_at_idx" ON "role_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "role_groups_audit_logs_role_group_id_idx" ON "role_groups_audit_logs" USING btree ("role_group_id");--> statement-breakpoint
CREATE INDEX "role_groups_audit_logs_action_idx" ON "role_groups_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "role_tag_audit_logs_role_tag_id_idx" ON "role_tag_audit_logs" USING btree ("role_tag_id");--> statement-breakpoint
CREATE INDEX "role_tag_audit_logs_action_idx" ON "role_tag_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "role_tags_role_id_tag_id_unique" ON "role_tags" USING btree ("role_id","tag_id") WHERE "role_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "role_tags_deleted_at_idx" ON "role_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_role_audit_logs_user_role_id_idx" ON "user_role_audit_logs" USING btree ("user_role_id");--> statement-breakpoint
CREATE INDEX "user_role_audit_logs_action_idx" ON "user_role_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_tags_audit_logs_user_tag_id_idx" ON "user_tags_audit_logs" USING btree ("user_tag_id");--> statement-breakpoint
CREATE INDEX "user_tags_audit_logs_action_idx" ON "user_tags_audit_logs" USING btree ("action");