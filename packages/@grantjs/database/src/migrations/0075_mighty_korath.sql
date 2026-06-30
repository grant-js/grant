CREATE TABLE "event_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigserial NOT NULL,
	"type" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"delivery_class" varchar(20) DEFAULT 'notification' NOT NULL,
	"scope_tenant" varchar(50) NOT NULL,
	"scope_id" varchar(255) NOT NULL,
	"actor_user_id" uuid,
	"subject_user_id" uuid,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"relay_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_log_delivery_class_check" CHECK (("delivery_class" IN ('transactional', 'notification'))),
	CONSTRAINT "event_log_relay_status_check" CHECK (("relay_status" IN ('pending', 'dispatched')))
);
--> statement-breakpoint
ALTER TABLE "event_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_log_relay_status_sequence_idx" ON "event_log" USING btree ("relay_status","sequence");--> statement-breakpoint
CREATE INDEX "event_log_scope_sequence_idx" ON "event_log" USING btree ("scope_tenant","scope_id","sequence");--> statement-breakpoint
CREATE INDEX "event_log_type_idx" ON "event_log" USING btree ("type");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "event_log" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR scope_id LIKE '%' || current_setting('app.current_project_id', true));--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "event_log" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);