-- ADR 0011 section 7: platform password cut-over. NOT a wipe.
--
-- Copies the password hash out of each Email authentication method's provider_data into
-- user_credentials, then removes it (and the import marker) from provider_data. The hash is
-- copied verbatim, so every password keeps working with no reset (bcrypt reads its cost from
-- the hash). One transaction (the migrator's), idempotent, count-reporting.
--
--   no passwordSource (set in Grant)                  -> source 'migrated'
--   passwordSource = 'cdm-import' AND is_verified     -> source 'migrated-import'
--   passwordSource = 'cdm-import' AND NOT is_verified -> NOT carried (tenant-written, unproven)
--   any other passwordSource value                    -> NOT carried (provenance unknown)
--
-- A user has one platform credential: among a user's eligible Email methods the most
-- recently updated hash wins. Soft-deleted methods and soft-deleted users are not carried.
-- An existing live credential is never overwritten (ON CONFLICT DO NOTHING), so a re-run
-- adds nothing. Plain-text password-reset tokens (provider_data.passwordResetOtp) are removed
-- too: from this release a reset token is stored as a digest, so an outstanding mailed link
-- stops working and the person requests a new one.
--
-- Residual copies: the hash also sat in the provider_data GIN index and in dead tuples until
-- vacuum, and backups keep the old value. Neither is scrubbed here.
--
-- Counts are emitted as RAISE NOTICE lines (migration log). No hash or address is logged.
DO $$
DECLARE
  v_scanned integer;
  v_picked integer;
  v_copied_migrated integer;
  v_copied_import integer;
  v_dropped_unverified_import integer;
  v_dropped_unknown_marker integer;
  v_skipped_existing integer;
  v_stripped_without_copy integer;
  v_methods_stripped integer;
  v_reset_tokens_removed integer;
BEGIN
  CREATE TEMP TABLE _credential_cutover ON COMMIT DROP AS
  SELECT
    m.id,
    m.user_id,
    m.is_verified,
    m.deleted_at AS method_deleted_at,
    u.deleted_at AS user_deleted_at,
    m.updated_at,
    NULLIF(m.provider_data ->> 'hashedPassword', '') AS hash,
    NULLIF(m.provider_data ->> 'passwordSource', '') AS marker
  FROM user_authentication_methods m
  JOIN users u ON u.id = m.user_id
  WHERE m.provider = 'email'
    AND jsonb_typeof(m.provider_data) = 'object'
    AND jsonb_exists(m.provider_data, 'hashedPassword');

  SELECT count(*) INTO v_scanned FROM _credential_cutover;

  SELECT count(*) INTO v_dropped_unverified_import
  FROM _credential_cutover
  WHERE hash IS NOT NULL AND marker = 'cdm-import' AND NOT is_verified;

  SELECT count(*) INTO v_dropped_unknown_marker
  FROM _credential_cutover
  WHERE hash IS NOT NULL AND marker IS NOT NULL AND marker <> 'cdm-import';

  CREATE TEMP TABLE _credential_cutover_pick ON COMMIT DROP AS
  SELECT DISTINCT ON (user_id)
    user_id,
    hash,
    CASE WHEN marker IS NULL THEN 'migrated' ELSE 'migrated-import' END AS source
  FROM _credential_cutover
  WHERE hash IS NOT NULL
    AND char_length(hash) <= 255
    AND method_deleted_at IS NULL
    AND user_deleted_at IS NULL
    AND (marker IS NULL OR (marker = 'cdm-import' AND is_verified))
  ORDER BY user_id, updated_at DESC, id;

  SELECT count(*) INTO v_picked FROM _credential_cutover_pick;

  WITH inserted AS (
    INSERT INTO user_credentials (user_id, hash, source)
    SELECT user_id, hash, source FROM _credential_cutover_pick
    ON CONFLICT (user_id) WHERE deleted_at IS NULL DO NOTHING
    RETURNING source
  )
  SELECT
    count(*) FILTER (WHERE source = 'migrated'),
    count(*) FILTER (WHERE source = 'migrated-import')
  INTO v_copied_migrated, v_copied_import
  FROM inserted;

  v_skipped_existing := v_picked - v_copied_migrated - v_copied_import;
  -- Everything scanned that is neither copied, nor dropped by rule, nor already covered:
  -- soft-deleted methods and users, an empty hash, and a second Email method for the same
  -- user whose hash lost to the more recently updated one.
  v_stripped_without_copy := v_scanned - v_copied_migrated - v_copied_import
    - v_skipped_existing - v_dropped_unverified_import - v_dropped_unknown_marker;

  SELECT count(*) INTO v_reset_tokens_removed
  FROM user_authentication_methods
  WHERE provider = 'email'
    AND jsonb_typeof(provider_data) = 'object'
    AND jsonb_exists(provider_data, 'passwordResetOtp');

  UPDATE user_authentication_methods
  SET provider_data = provider_data - 'hashedPassword' - 'passwordSource' - 'passwordResetOtp'
  WHERE provider = 'email'
    AND jsonb_typeof(provider_data) = 'object'
    AND (
      jsonb_exists(provider_data, 'hashedPassword')
      OR jsonb_exists(provider_data, 'passwordSource')
      OR jsonb_exists(provider_data, 'passwordResetOtp')
    );
  GET DIAGNOSTICS v_methods_stripped = ROW_COUNT;

  RAISE NOTICE 'platform password cut-over: email methods with a hash scanned: %', v_scanned;
  RAISE NOTICE 'platform password cut-over: copied as migrated: %', v_copied_migrated;
  RAISE NOTICE 'platform password cut-over: copied as migrated-import (verified cdm-import): %', v_copied_import;
  RAISE NOTICE 'platform password cut-over: dropped, unverified cdm-import: %', v_dropped_unverified_import;
  RAISE NOTICE 'platform password cut-over: dropped, unknown passwordSource value: %', v_dropped_unknown_marker;
  RAISE NOTICE 'platform password cut-over: skipped, a live credential already existed: %', v_skipped_existing;
  RAISE NOTICE 'platform password cut-over: stripped without a copy (soft-deleted, empty or superseded): %', v_stripped_without_copy;
  RAISE NOTICE 'platform password cut-over: plain-text reset tokens removed: %', v_reset_tokens_removed;
  RAISE NOTICE 'platform password cut-over: provider_data rows rewritten: %', v_methods_stripped;
END $$;
