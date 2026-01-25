ALTER TABLE "resources" DROP CONSTRAINT "resources_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN "created_by";