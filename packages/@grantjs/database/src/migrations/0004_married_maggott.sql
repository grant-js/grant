CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tags_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_tag_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "user_audit_logs_created_at_idx";--> statement-breakpoint
DROP INDEX "users_created_at_idx";--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags_audit_logs" ADD CONSTRAINT "user_tags_audit_logs_user_tag_id_user_tags_id_fk" FOREIGN KEY ("user_tag_id") REFERENCES "public"."user_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_tags_user_id_tag_id_unique" ON "user_tags" USING btree ("user_id","tag_id");