CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"invited_by" uuid NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organization_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organization_invitation_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_invitation_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitation_audit_logs" ADD CONSTRAINT "organization_invitation_audit_logs_organization_invitation_id_organization_invitations_id_fk" FOREIGN KEY ("organization_invitation_id") REFERENCES "public"."organization_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_invitations_organization_id_idx" ON "organization_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "organization_invitations_status_idx" ON "organization_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_invitations_email_organization_id_idx" ON "organization_invitations" USING btree ("email","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invitations_deleted_at_idx" ON "organization_invitations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_invitation_audit_logs_organization_invitation_id_idx" ON "organization_invitation_audit_logs" USING btree ("organization_invitation_id");--> statement-breakpoint
CREATE INDEX "organization_invitation_audit_logs_action_idx" ON "organization_invitation_audit_logs" USING btree ("action");