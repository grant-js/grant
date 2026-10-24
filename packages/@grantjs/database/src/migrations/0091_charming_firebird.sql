ALTER TABLE "project_oauth_grants" ADD COLUMN "previous_token" varchar(255);--> statement-breakpoint
ALTER TABLE "project_oauth_grants" ADD COLUMN "family_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "previous_token" varchar(255);--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "family_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE INDEX "project_oauth_grants_previous_token_idx" ON "project_oauth_grants" USING btree ("previous_token");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_family_id_idx" ON "project_oauth_grants" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "user_sessions_previous_token_idx" ON "user_sessions" USING btree ("previous_token");--> statement-breakpoint
CREATE INDEX "user_sessions_family_id_idx" ON "user_sessions" USING btree ("family_id");