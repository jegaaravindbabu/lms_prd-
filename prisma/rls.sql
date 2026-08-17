-- ============================================================================
--  Row-Level Security (RLS) — tenant isolation
-- ----------------------------------------------------------------------------
--  Run this AFTER `prisma migrate deploy` (Prisma does not manage RLS itself).
--
--  How it works:
--    • Every request sets a transaction-local variable `app.current_tenant_id`
--      (see db-tenant-context.ts).
--    • Each policy below only exposes rows whose "tenantId" matches it.
--    • If the variable is unset, current_setting(..., true) returns NULL and
--      NO rows match → safe deny-by-default.
--
--  Roles:
--    • The APP connects as a normal role (subject to RLS).
--    • Migrations + platform-admin tasks connect as a role WITH BYPASSRLS
--      (so you can manage all tenants). Keep that connection string separate
--      and never expose it to tenant-facing requests.
--
--  Auth/session tables (User, Membership-lookup during login, OtpChallenge,
--  RefreshToken, Device) are scoped in application code by exact key, so they
--  are intentionally NOT under RLS to avoid a chicken-and-egg during login.
--  (Membership itself IS under RLS for normal reads.)
-- ============================================================================

-- One-time role setup (adjust names/passwords; run as a superuser):
--   CREATE ROLE app_user LOGIN PASSWORD '***';
--   CREATE ROLE platform_admin LOGIN PASSWORD '***' BYPASSRLS;
--   GRANT USAGE ON SCHEMA public TO app_user, platform_admin;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, platform_admin;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, platform_admin;

DO $$
DECLARE
  tbl text;
  scoped text[] := ARRAY[
    'Membership','GatewayCredential','UsageMeter','ClientLicense',
    'Course','Section','Lesson','Enrollment','Payment','Coupon',
    'Progress','Test','Question','TestQuestion','Attempt','Response'
  ];
BEGIN
  FOREACH tbl IN ARRAY scoped LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    -- FORCE also applies RLS to the table owner (belt-and-suspenders).
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING ("tenantId" = current_setting(''app.current_tenant_id'', true)) '
      'WITH CHECK ("tenantId" = current_setting(''app.current_tenant_id'', true));',
      tbl
    );
  END LOOP;
END $$;

-- Notes:
--  • Identifiers are quoted (%I) because Prisma creates PascalCase tables and
--    camelCase columns ("Course", "tenantId"). If you later add @@map to
--    snake_case, update the array and the "tenantId" reference accordingly.
--  • Re-run this file whenever you add a new tenant-scoped table.
