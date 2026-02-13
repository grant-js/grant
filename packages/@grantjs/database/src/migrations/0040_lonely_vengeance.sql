ALTER TABLE "account_project_api_key_audit_logs" DROP CONSTRAINT "account_project_api_key_audit_logs_performed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "account_audit_logs" DROP CONSTRAINT "account_audit_logs_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" DROP CONSTRAINT "api_key_audit_logs_performed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_revoked_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_project_api_key_audit_logs" DROP CONSTRAINT "organization_project_api_key_audit_logs_performed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "signing_key_audit_logs" DROP CONSTRAINT "signing_key_audit_logs_performed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" DROP CONSTRAINT "project_user_api_key_audit_logs_performed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_audit_logs" DROP CONSTRAINT "resource_audit_logs_performed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_audit_logs" DROP CONSTRAINT "user_audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "account_project_api_key_audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "account_audit_logs" ALTER COLUMN "account_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_project_api_key_audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signing_key_audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "account_project_api_key_audit_logs" ADD CONSTRAINT "account_project_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_audit_logs" ADD CONSTRAINT "account_audit_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" ADD CONSTRAINT "api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_project_api_key_audit_logs" ADD CONSTRAINT "organization_project_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_key_audit_logs" ADD CONSTRAINT "signing_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD CONSTRAINT "project_user_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD CONSTRAINT "resource_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;