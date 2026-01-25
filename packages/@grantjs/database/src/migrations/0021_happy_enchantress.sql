-- Step 1: Create the new api_keys table
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"client_secret_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"description" varchar(1000),
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint

-- Step 2: Migrate existing data from project_user_api_keys to api_keys
-- This preserves existing records by copying them to the new table
INSERT INTO "api_keys" (
	"id",
	"client_id",
	"client_secret_hash",
	"name",
	"description",
	"expires_at",
	"last_used_at",
	"is_revoked",
	"revoked_at",
	"revoked_by",
	"created_by",
	"created_at",
	"updated_at",
	"deleted_at"
)
SELECT 
	"id",
	"client_id",
	"client_secret_hash",
	"name",
	"description",
	"expires_at",
	"last_used_at",
	"is_revoked",
	"revoked_at",
	"revoked_by",
	"created_by",
	"created_at",
	"updated_at",
	"deleted_at"
FROM "project_user_api_keys";
--> statement-breakpoint

-- Step 3: Rename audit log table and column (for API key changes)
-- Note: This table tracks changes to API key data (name, description, revocation, etc.)
ALTER TABLE "project_user_api_key_audit_logs" RENAME TO "api_key_audit_logs";
--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" RENAME COLUMN "project_user_api_key_id" TO "api_key_id";
--> statement-breakpoint

-- Step 3b: Create new audit log table for pivot relationship changes
-- Note: This table tracks changes to the pivot relationship (attach/detach API key to project-user)
CREATE TABLE "project_user_api_key_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_user_api_key_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Step 4: Drop old constraints from audit logs
ALTER TABLE "api_key_audit_logs" DROP CONSTRAINT IF EXISTS "project_user_api_key_audit_logs_project_user_api_key_id_project_user_api_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" DROP CONSTRAINT IF EXISTS "project_user_api_key_audit_logs_performed_by_users_id_fk";
--> statement-breakpoint

-- Step 5: Drop old constraints from project_user_api_keys
ALTER TABLE "project_user_api_keys" DROP CONSTRAINT IF EXISTS "project_user_api_keys_revoked_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP CONSTRAINT IF EXISTS "project_user_api_keys_created_by_users_id_fk";
--> statement-breakpoint

-- Step 6: Drop old indexes
DROP INDEX IF EXISTS "project_user_api_key_audit_logs_key_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "project_user_api_key_audit_logs_action_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "project_user_api_keys_client_id_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "project_user_api_keys_project_user_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "project_user_api_keys_is_revoked_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "project_user_api_keys_deleted_at_idx";
--> statement-breakpoint

-- Step 7: Add api_key_id column to project_user_api_keys (nullable first)
ALTER TABLE "project_user_api_keys" ADD COLUMN "api_key_id" uuid;
--> statement-breakpoint

-- Step 8: Populate api_key_id by matching existing id (since we used the same id when migrating)
UPDATE "project_user_api_keys" SET "api_key_id" = "id";
--> statement-breakpoint

-- Step 9: Now make api_key_id NOT NULL
ALTER TABLE "project_user_api_keys" ALTER COLUMN "api_key_id" SET NOT NULL;
--> statement-breakpoint

-- Step 10: Add foreign key constraints to api_keys
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Step 11: Create indexes on api_keys
CREATE UNIQUE INDEX "api_keys_client_id_unique" ON "api_keys" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "api_keys_deleted_at_idx" ON "api_keys" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "api_keys_is_revoked_idx" ON "api_keys" USING btree ("is_revoked");
--> statement-breakpoint

-- Step 12: Add foreign key constraints to audit logs
ALTER TABLE "api_key_audit_logs" ADD CONSTRAINT "api_key_audit_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" ADD CONSTRAINT "api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Step 13: Add foreign key constraint from project_user_api_keys to api_keys
ALTER TABLE "project_user_api_keys" ADD CONSTRAINT "project_user_api_keys_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Step 14: Create indexes on audit logs
CREATE INDEX "api_key_audit_logs_api_key_id_idx" ON "api_key_audit_logs" USING btree ("api_key_id");
--> statement-breakpoint
CREATE INDEX "api_key_audit_logs_action_idx" ON "api_key_audit_logs" USING btree ("action");
--> statement-breakpoint

-- Step 15: Create indexes on project_user_api_keys
CREATE UNIQUE INDEX "project_user_api_keys_api_key_project_user_unique" ON "project_user_api_keys" USING btree ("api_key_id","project_id","user_id") WHERE "project_user_api_keys"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "project_user_api_keys_api_key_id_idx" ON "project_user_api_keys" USING btree ("api_key_id");
--> statement-breakpoint
CREATE INDEX "project_user_api_keys_deleted_at_idx" ON "project_user_api_keys" USING btree ("deleted_at");
--> statement-breakpoint

-- Step 15b: Add foreign key constraints and indexes for pivot audit logs
ALTER TABLE "project_user_api_key_audit_logs" ADD CONSTRAINT "project_user_api_key_audit_logs_project_user_api_key_id_project_user_api_keys_id_fk" FOREIGN KEY ("project_user_api_key_id") REFERENCES "public"."project_user_api_keys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD CONSTRAINT "project_user_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "project_user_api_key_audit_logs_project_user_api_key_id_idx" ON "project_user_api_key_audit_logs" USING btree ("project_user_api_key_id");
--> statement-breakpoint
CREATE INDEX "project_user_api_key_audit_logs_action_idx" ON "project_user_api_key_audit_logs" USING btree ("action");
--> statement-breakpoint

-- Step 16: Drop old columns from project_user_api_keys (now that data is migrated)
ALTER TABLE "project_user_api_keys" DROP COLUMN "client_id";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "client_secret_hash";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "name";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "description";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "expires_at";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "last_used_at";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "is_revoked";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "revoked_at";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "revoked_by";
--> statement-breakpoint
ALTER TABLE "project_user_api_keys" DROP COLUMN "created_by";
