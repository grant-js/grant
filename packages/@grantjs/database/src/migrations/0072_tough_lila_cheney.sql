DROP INDEX "api_keys_client_id_unique";--> statement-breakpoint
CREATE INDEX "api_keys_client_id_idx" ON "api_keys" USING btree ("client_id");