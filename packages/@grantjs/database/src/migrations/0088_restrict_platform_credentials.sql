-- ADR 0011 section 2 (slice 2): database-enforced separation of platform passwords.
--
-- Migration 0042 gave the restricted RLS role (grant_app_restricted, used for every scoped
-- request) default privileges on every table, so it could read user_credentials and every
-- hash in it. Revoke them on the platform credential table and its lockout and audit
-- tables: platform credential operations now run on the base (owner) connection inside the
-- credential service, never inside a scoped request's transaction. The project-scope tables
-- keep the role's privileges and their RLS policy.
--
-- The role is created by 0042 under a fixed name; guard for a database where it is absent.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'grant_app_restricted') THEN
    REVOKE ALL PRIVILEGES ON TABLE
      public.user_credentials,
      public.user_credential_lockouts,
      public.user_credential_audit_logs
    FROM grant_app_restricted;
  END IF;
END $$;
