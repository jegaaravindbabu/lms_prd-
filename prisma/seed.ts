// ============================================================================
//  Seed — demo data for local development
// ----------------------------------------------------------------------------
//  Creates two white-labeled schools (tenants), their owners, an instructor,
//  a student with memberships, one published course with sections/lessons,
//  and a ClientLicense per tenant. Uses the BYPASSRLS admin client because
//  seeding writes across tenants.
//
//  Run: npm run db:seed   (after `prisma migrate deploy` + `npm run db:rls`)
// ============================================================================

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL,
});

async function main() {
  console.log("🌱  Seeding demo data…");

  // --- Users (GLOBAL identity: one phone = one user) ----------------------
  const platformAdmin = await db.user.upsert({
    where: { phone: "+910000000000" },
    update: {},
    create: {
      phone: "+910000000000",
      phoneVerified: true,
      name: "Platform Admin",
      email: "admin@yourplatform.com",
      isPlatformAdmin: true,
    },
  });

  const ownerA = await db.user.upsert({
    where: { phone: "+919000000001" },
    update: {},
    create: { phone: "+919000000001", phoneVerified: true, name: "Dr. Alka Rao", email: "alka@physicswala.com" },
  });

  const ownerB = await db.user.upsert({
    where: { phone: "+919000000002" },
    update: {},
    create: { phone: "+919000000002", phoneVerified: true, name: "Rahul Mehta", email: "rahul@quantacademy.com" },
  });

  const instructor = await db.user.upsert({
    where: { phone: "+919000000003" },
    update: {},
    create: { phone: "+919000000003", phoneVerified: true, name: "Prof. Neha Iyer" },
  });

  const student = await db.user.upsert({
    where: { phone: "+919999999999" },
    update: {},
    create: { phone: "+919999999999", phoneVerified: true, name: "Aarav Sharma" },
  });

  // --- Tenant A: Physicswala --------------------------------------------
  const tenantA = await db.tenant.upsert({
    where: { subdomain: "physicswala" },
    update: {},
    create: {
      name: "Physicswala",
      subdomain: "physicswala",
      status: "ACTIVE",
      domainStatus: "ACTIVE",
      primaryColor: "#4F46E5",
      secondaryColor: "#0EA5E9",
      emailFromName: "Physicswala",
      ownerId: ownerA.id,
      license: {
        create: {
          oneTimeFee: 150000,
          amcTier: "GROWTH",
          amcAmount: 60000,
          amcCurrency: "INR",
          amcStartedAt: new Date(),
          amcNextDueAt: new Date(Date.now() + 365 * 864e5),
          capStudents: 5000,
          capStorageMb: 20480,
          status: "ACTIVE",
        },
      },
    },
  });

  // --- Tenant B: Quant Academy ------------------------------------------
  const tenantB = await db.tenant.upsert({
    where: { subdomain: "quant" },
    update: {},
    create: {
      name: "Quant Academy",
      subdomain: "quant",
      status: "ACTIVE",
      domainStatus: "ACTIVE",
      primaryColor: "#B8862F",
      secondaryColor: "#1F2937",
      emailFromName: "Quant Academy",
      ownerId: ownerB.id,
      license: {
        create: {
          oneTimeFee: 250000,
          amcTier: "INSTITUTE",
          amcAmount: 120000,
          amcStartedAt: new Date(),
          amcNextDueAt: new Date(Date.now() + 365 * 864e5),
          capStudents: 20000,
          capStorageMb: 102400,
          status: "ACTIVE",
        },
      },
    },
  });

  // --- Memberships (per-tenant access) -----------------------------------
  const memberships: Array<[string, string, "OWNER" | "INSTRUCTOR" | "STUDENT"]> = [
    [ownerA.id, tenantA.id, "OWNER"],
    [ownerB.id, tenantB.id, "OWNER"],
    [instructor.id, tenantA.id, "INSTRUCTOR"],
    [student.id, tenantA.id, "STUDENT"],
    [student.id, tenantB.id, "STUDENT"], // same person, two schools, no data bleed
  ];
  for (const [userId, tenantId, role] of memberships) {
    await db.membership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: { role },
      create: { userId, tenantId, role },
    });
  }

  // --- A published course with content (Tenant A) ------------------------
  const existing = await db.course.findUnique({
    where: { tenantId_slug: { tenantId: tenantA.id, slug: "neet-physics-mechanics" } },
  });
  if (!existing) {
    await db.course.create({
      data: {
        tenantId: tenantA.id,
        title: "NEET Physics — Mechanics Masterclass",
        slug: "neet-physics-mechanics",
        subtitle: "From Newton's laws to rotational dynamics, built for rank-holders.",
        description:
          "A complete, exam-focused journey through classical mechanics with worked PYQs, intuition-first lessons, and full-length tests.",
        price: 2999,
        currency: "INR",
        status: "PUBLISHED",
        publishedAt: new Date(),
        instructorId: instructor.id,
        sections: {
          create: [
            {
              tenantId: tenantA.id,
              title: "Foundations",
              order: 1,
              lessons: {
                create: [
                  {
                    tenantId: tenantA.id,
                    courseId: "", // set below via nested — placeholder replaced
                    title: "Course orientation (free preview)",
                    order: 1,
                    type: "VIDEO",
                    isPreview: true,
                    videoProvider: "YOUTUBE",
                    videoId: "dQw4w9WgXcQ",
                    durationSec: 320,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    // Backfill lesson.courseId (denormalized) for the created course.
    const created = await db.course.findUnique({
      where: { tenantId_slug: { tenantId: tenantA.id, slug: "neet-physics-mechanics" } },
      include: { sections: { include: { lessons: true } } },
    });
    if (created) {
      for (const section of created.sections) {
        for (const lesson of section.lessons) {
          await db.lesson.update({ where: { id: lesson.id }, data: { courseId: created.id } });
        }
      }
    }
  }

  console.log("✅  Seed complete.");
  console.log("    Tenants:  physicswala.<root>, quant.<root>");
  console.log("    Student:  +919999999999  (member of both schools)");
  console.log("    Owner A:  +919000000001  (Physicswala)");
  console.log("    Any OTP code works in OTP_MODE=console — check server logs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
