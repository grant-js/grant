CREATE INDEX "user_audit_logs_user_id_idx" ON "user_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_audit_logs_action_idx" ON "user_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_audit_logs_created_at_idx" ON "user_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_unique_idx" ON "users" USING btree ("email") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");