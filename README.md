# White-Label Multi-Tenant LMS

A hosted platform where each **school** (tenant) runs as its own branded academy —
its own domain, branding, and payment gateway — on **Next.js (App Router) + Prisma +
PostgreSQL Row-Level Security**.

This is the **Foundation + Auth + Tenancy** pass:

- ✅ Prisma schema + RLS wired (`prisma/schema.prisma`, `prisma/rls.sql`)
- ✅ `withTenant()` transaction context so RLS fires on every query (`src/lib/db.ts`)
- ✅ Host → tenant resolution + middleware (`src/lib/tenant.ts`, `src/middleware.ts`)
- ✅ Phone-OTP auth with global identity + per-school membership (`src/lib/auth.ts`, `otp.ts`)
- ✅ Role-based access on top of RLS (`src/lib/rbac.ts`)
- ✅ Per-tenant branding → CSS variables recolor the whole UI (`src/lib/branding.ts`)
- ✅ A deliberately **premium** UI: obsidian/ivory theme, glass surfaces, serif display type
- ✅ Pages: tenant landing, platform landing, phone-OTP login, student dashboard, owner console

> Content authoring, the video player, and commerce/checkout are the next passes
> (see the PRD roadmap). The schema already supports them.

## Prerequisites

- Node 18+
- PostgreSQL 14+
- `psql` on your PATH (to apply RLS)

## Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, DATABASE_ADMIN_URL, AUTH_SECRET

# Create the two DB roles (see prisma/rls.sql header), then:
npm run db:deploy           # prisma migrate deploy
npm run db:rls              # apply Row-Level Security policies
npm run db:seed            # demo tenants, users, a course
npm run dev
```

Set up local wildcard subdomains for multi-tenant testing. The easiest option is
[`lvh.me`](http://lvh.me) (always resolves to 127.0.0.1):

- Platform root: `http://lvh.me:3000`
- School A: `http://physicswala.lvh.me:3000`
- School B: `http://quant.lvh.me:3000`

`.env` should have `NEXT_PUBLIC_ROOT_DOMAIN="lvh.me:3000"` for this to work.

## Demo logins (OTP_MODE=console)

OTP codes print to the **server terminal** — there's no SMS in dev.

| Phone | Role | School |
|---|---|---|
| `+919999999999` | Student | Physicswala **and** Quant (same identity, isolated data) |
| `+919000000001` | Owner | Physicswala |
| `+919000000002` | Owner | Quant Academy |

1. Visit `http://physicswala.lvh.me:3000/login`
2. Enter a phone number → read the 6-digit code from the server log → sign in.

## Architecture notes

- **Isolation is enforced by Postgres, not app code.** Every tenant query runs inside
  `withTenant(tenantId, tx => …)`, which sets a transaction-local `app.current_tenant_id`
  that RLS policies filter on. Missing context ⇒ zero rows (deny-by-default).
- **Two DB connections.** The app uses the RLS-subject role (`DATABASE_URL`). Migrations,
  tenant resolution, and the platform console use the `BYPASSRLS` role (`DATABASE_ADMIN_URL`) —
  never exposed to tenant-facing requests.
- **Global identity.** One phone = one `User`. School access is a `Membership` row.
- **Re-run `prisma/rls.sql`** whenever you add a new tenant-scoped table.

## Project layout

```
prisma/            schema.prisma · rls.sql · seed.ts
src/lib/           db · tenant · auth · otp · rbac · branding · utils
src/middleware.ts  forwards the host for tenant resolution
src/app/           landing · login · (dashboard)/{dashboard,admin} · not-active
src/components/    ui/ (shadcn-style) · brand/ · app/ (shell)
```
