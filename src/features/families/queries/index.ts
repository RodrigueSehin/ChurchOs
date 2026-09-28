import "server-only";
import { and, asc, count, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { familyMembers, families, people } from "@/lib/db/schema";

export const FAMILIES_PAGE_SIZE = 20;

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Utilisée par le tableau de bord et la page Membres (carte KPI "Familles") — voir la règle de
 * façade cross-module dans 01-project-structure.md. */
export async function getFamiliesKpi(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const [[now], [before]] = await Promise.all([
    db.select({ value: count() }).from(families).where(eq(families.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(families)
      .where(and(eq(families.organizationId, organizationId), sql`${families.createdAt}::date <= ${cutoff30}`)),
  ]);
  const nowValue = now?.value ?? 0;
  const beforeValue = before?.value ?? 0;
  const deltaPct = beforeValue <= 0 ? (nowValue > 0 ? 100 : 0) : Math.round(((nowValue - beforeValue) / beforeValue) * 100);
  return { value: nowValue, deltaPct };
}

export async function getFamilies({
  organizationId,
  search,
  page = 1,
}: {
  organizationId: string;
  search?: string;
  page?: number;
}) {
  const conditions = [eq(families.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(families.name, `%${search.trim()}%`));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: families.id,
        name: families.name,
        city: families.city,
        primaryContactFirstName: people.firstName,
        primaryContactLastName: people.lastName,
      })
      .from(families)
      .leftJoin(people, eq(people.id, families.primaryContactPersonId))
      .where(where)
      .orderBy(asc(families.name))
      .limit(FAMILIES_PAGE_SIZE)
      .offset((page - 1) * FAMILIES_PAGE_SIZE),
    db.select({ value: count() }).from(families).where(where),
  ]);

  const familyIds = rows.map((r) => r.id);
  const memberCounts = familyIds.length
    ? await db
        .select({ familyId: familyMembers.familyId, value: count() })
        .from(familyMembers)
        .where(eq(familyMembers.organizationId, organizationId))
        .groupBy(familyMembers.familyId)
    : [];
  const countByFamily = new Map(memberCounts.map((m) => [m.familyId, m.value]));

  return {
    rows: rows.map((r) => ({ ...r, memberCount: countByFamily.get(r.id) ?? 0 })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: FAMILIES_PAGE_SIZE,
  };
}

export async function getFamilyDetail(organizationId: string, familyId: string) {
  const [family] = await db
    .select()
    .from(families)
    .where(and(eq(families.id, familyId), eq(families.organizationId, organizationId)));
  if (!family) return null;

  const members = await db
    .select({
      familyMemberId: familyMembers.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      phone: people.phone,
      relationshipToHead: familyMembers.relationshipToHead,
      isHead: familyMembers.isHead,
      isPrimaryContact: familyMembers.isPrimaryContact,
    })
    .from(familyMembers)
    .innerJoin(people, eq(people.id, familyMembers.personId))
    .where(eq(familyMembers.familyId, familyId))
    .orderBy(asc(people.firstName));

  return { family, members };
}
