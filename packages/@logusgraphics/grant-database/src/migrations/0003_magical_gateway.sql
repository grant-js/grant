CREATE INDEX "role_audit_logs_role_id_idx" ON "role_audit_logs" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_audit_logs_action_idx" ON "role_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "role_audit_logs_created_at_idx" ON "role_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "roles_name_unique_idx" ON "roles" USING btree ("name") WHERE "roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "roles_deleted_at_idx" ON "roles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "roles_created_at_idx" ON "roles" USING btree ("created_at");