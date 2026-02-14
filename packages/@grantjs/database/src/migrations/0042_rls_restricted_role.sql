-- RLS: Create restricted role for tenant-scoped request isolation.
-- grant_user (table owner) bypasses RLS by default in PostgreSQL.
-- Scoped requests SET LOCAL ROLE to this restricted role inside a transaction,
-- which makes RLS policies on pivot tables apply.
-- System operations and background jobs never switch role, so they bypass RLS naturally.

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grant_app_restricted') THEN
    CREATE ROLE grant_app_restricted NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO grant_app_restricted;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO grant_app_restricted;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO grant_app_restricted;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO grant_app_restricted;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO grant_app_restricted;
--> statement-breakpoint
GRANT grant_app_restricted TO grant_user;
