CREATE TABLE "user_session_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_session_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_session_audit_logs" ADD CONSTRAINT "user_session_audit_logs_user_session_id_user_sessions_id_fk" FOREIGN KEY ("user_session_id") REFERENCES "public"."user_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_session_audit_logs_user_session_id_idx" ON "user_session_audit_logs" USING btree ("user_session_id");--> statement-breakpoint
CREATE INDEX "user_session_audit_logs_action_idx" ON "user_session_audit_logs" USING btree ("action");