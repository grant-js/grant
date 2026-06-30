CREATE TABLE "webhook_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp,
	"last_response_status" integer,
	"error_details" jsonb,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_delivery_attempts_status_check" CHECK (("status" IN ('pending', 'running', 'delivered', 'failed', 'dead')))
);
--> statement-breakpoint
ALTER TABLE "webhook_delivery_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scope_tenant" varchar(50) NOT NULL,
	"scope_id" varchar(255) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"secret_ref" varchar(255) NOT NULL,
	"event_types" text[] NOT NULL,
	"ordering_mode" varchar(20) DEFAULT 'best_effort' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"description" varchar(500),
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "webhook_subscriptions_ordering_mode_check" CHECK (("ordering_mode" IN ('best_effort', 'strict')))
);
--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_event_id_event_log_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event_log"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_delivery_attempts_event_subscription_unique" ON "webhook_delivery_attempts" USING btree ("event_id","subscription_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_attempts_due_idx" ON "webhook_delivery_attempts" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX "webhook_delivery_attempts_subscription_id_idx" ON "webhook_delivery_attempts" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_project_id_idx" ON "webhook_subscriptions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_scope_idx" ON "webhook_subscriptions" USING btree ("scope_tenant","scope_id");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_active_idx" ON "webhook_subscriptions" USING btree ("active");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_deleted_at_idx" ON "webhook_subscriptions" USING btree ("deleted_at");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "webhook_delivery_attempts" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR EXISTS (SELECT 1 FROM webhook_subscriptions ws WHERE ws.id = subscription_id AND ws.project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "webhook_delivery_attempts" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "webhook_subscriptions" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "webhook_subscriptions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);