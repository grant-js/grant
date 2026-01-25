CREATE TABLE "account_role_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_role_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "actions" SET DEFAULT '{"query","read","create","update","delete"}';--> statement-breakpoint
ALTER TABLE "account_role_audit_logs" ADD CONSTRAINT "account_role_audit_logs_account_role_id_account_roles_id_fk" FOREIGN KEY ("account_role_id") REFERENCES "public"."account_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_roles" ADD CONSTRAINT "account_roles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_roles" ADD CONSTRAINT "account_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_role_audit_logs_account_role_id_idx" ON "account_role_audit_logs" USING btree ("account_role_id");--> statement-breakpoint
CREATE INDEX "account_role_audit_logs_action_idx" ON "account_role_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "account_roles_account_id_role_id_unique" ON "account_roles" USING btree ("account_id","role_id") WHERE "account_roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_roles_deleted_at_idx" ON "account_roles" USING btree ("deleted_at");