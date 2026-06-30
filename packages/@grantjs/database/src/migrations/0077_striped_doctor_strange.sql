CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scope_tenant" varchar(50) NOT NULL,
	"scope_id" varchar(255) DEFAULT '' NOT NULL,
	"category" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"enabled" boolean NOT NULL,
	"source" varchar(20) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_channel_check" CHECK (("channel" IN ('in_app', 'email'))),
	CONSTRAINT "notification_preferences_source_check" CHECK (("source" IN ('user', 'org_enforced')))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"type" varchar(100) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"ref_entity" varchar(100),
	"ref_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"seen_at" timestamp,
	"read_at" timestamp,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp,
	"error_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_channel_check" CHECK (("channel" IN ('in_app', 'email'))),
	CONSTRAINT "notifications_status_check" CHECK (("status" IN ('pending', 'delivered', 'failed', 'dead')))
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_event_log_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event_log"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_unique" ON "notification_preferences" USING btree ("user_id","scope_tenant","scope_id","category","channel");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_event_recipient_channel_unique" ON "notifications" USING btree ("event_id","recipient_user_id","channel");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_due_idx" ON "notifications" USING btree ("channel","status","next_retry_at");