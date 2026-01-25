ALTER TABLE "accounts" DROP CONSTRAINT "accounts_slug_unique";--> statement-breakpoint
DROP INDEX "accounts_slug_idx";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "slug";