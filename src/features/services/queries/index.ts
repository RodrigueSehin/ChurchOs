import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { attendanceRecords, attendanceSessions, people, serviceAssignments, serviceTypes, services, teamMembers, teams, workers } from "@/lib/db/schema";

export const SERVICES_PAGE_SIZE = 20;

const SERVICE_STATUSES = ["planned", "confirmed", "completed", "cancelled"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function yearsAgoISO(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function yearStart(yearsAgo = 0): Date {
  const year = new Date().getUTCFullYear() - yearsAgo;
  return new Date(Date.UTC(year, 0, 1));
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getServiceTypes(organizationId: string) {
  return db
    .select()
    .from(serviceTypes)
    .where(and(eq(serviceTypes.organizationId, organizationId), eq(serviceTypes.isActive, true)))
    .orderBy(asc(serviceTypes.name));
}

export async function getServices(organizationId: string) {
  return db
    .select({
      id: services.id,
      title: services.title,
      startsAt: services.startsAt,
      endsAt: services.endsAt,
      location: services.location,
      status: services.status,
      serviceTypeId: services.serviceTypeId,
      serviceTypeName: serviceTypes.name,
    })
    .from(services)
    .leftJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
    .where(eq(services.organizationId, organizationId))
    .orderBy(desc(services.startsAt));
}

export interface ServicesListParams {
  organizationId: string;
  search?: string;
  status?: string;
  serviceTypeId?: string;
  page?: number;
}

/** Liste paginée pour la page `/services` — `getServices` (ci-dessus) reste inchangée car
 * réutilisée telle quelle par `/attendance` et par le sélecteur du formulaire, tous deux voulant
 * la liste complète non paginée. */
export async function getServicesList({ organizationId, search, status, serviceTypeId, page = 1 }: ServicesListParams) {
  const conditions = [eq(services.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(services.title, term), ilike(services.location, term))!);
  }
  if (status && (SERVICE_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(services.status, status));
  }
  if (serviceTypeId && UUID_RE.test(serviceTypeId)) {
    conditions.push(eq(services.serviceTypeId, serviceTypeId));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: services.id,
        title: services.title,
        startsAt: services.startsAt,
        endsAt: services.endsAt,
        location: services.location,
        status: services.status,
        serviceTypeId: services.serviceTypeId,
        serviceTypeName: serviceTypes.name,
      })
      .from(services)
      .leftJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
      .where(where)
      .orderBy(desc(services.startsAt))
      .limit(SERVICES_PAGE_SIZE)
      .offset((page - 1) * SERVICES_PAGE_SIZE),
    db.select({ value: count() }).from(services).where(where),
  ]);

  const serviceIds = rows.map((r) => r.id);
  const assignmentRows = serviceIds.length
    ? await db
        .select({
          serviceId: serviceAssignments.serviceId,
          role: serviceAssignments.role,
          firstName: people.firstName,
          lastName: people.lastName,
        })
        .from(serviceAssignments)
        .innerJoin(workers, eq(workers.id, serviceAssignments.workerId))
        .innerJoin(people, eq(people.id, workers.personId))
        .where(and(eq(serviceAssignments.organizationId, organizationId), inArray(serviceAssignments.serviceId, serviceIds)))
    : [];

  const assignmentsByService = new Map<string, typeof assignmentRows>();
  for (const a of assignmentRows) {
    const list = assignmentsByService.get(a.serviceId) ?? [];
    list.push(a);
    assignmentsByService.set(a.serviceId, list);
  }

  /** "Responsable" n'existe pas comme tel dans le schéma — dérivé du premier ouvrier affecté dont
   * le rôle (texte libre) contient "responsable", sinon simplement le premier ouvrier affecté,
   * sinon absent. Jamais une personne inventée. */
  function pickResponsable(serviceId: string) {
    const list = assignmentsByService.get(serviceId) ?? [];
    if (list.length === 0) return null;
    const lead = list.find((a) => a.role.toLowerCase().includes("responsable")) ?? list[0]!;
    return { firstName: lead.firstName, lastName: lead.lastName, role: lead.role };
  }

  return {
    rows: rows.map((r) => ({
      ...r,
      responsable: pickResponsable(r.id),
      assignedCount: assignmentsByService.get(r.id)?.length ?? 0,
    })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: SERVICES_PAGE_SIZE,
  };
}

export async function getServicesTabCounts(organizationId: string) {
  const [[all], perStatus] = await Promise.all([
    db.select({ value: count() }).from(services).where(eq(services.organizationId, organizationId)),
    db.select({ status: services.status, value: count() }).from(services).where(eq(services.organizationId, organizationId)).groupBy(services.status),
  ]);
  const byStatus = new Map(perStatus.map((r) => [r.status, r.value]));
  return {
    all: all?.value ?? 0,
    planned: byStatus.get("planned") ?? 0,
    confirmed: byStatus.get("confirmed") ?? 0,
    completed: byStatus.get("completed") ?? 0,
    cancelled: byStatus.get("cancelled") ?? 0,
  };
}

/** Prochains services (occurrences réelles à venir) — même rôle que `getUpcomingEvents` pour les
 * autres pages de ce lot. */
export async function getUpcomingServices(organizationId: string, limit = 4) {
  return db
    .select({ id: services.id, title: services.title, startsAt: services.startsAt, endsAt: services.endsAt, location: services.location })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), gte(services.startsAt, new Date())))
    .orderBy(asc(services.startsAt))
    .limit(limit);
}

export async function getServiceTypeDistribution(organizationId: string) {
  const rows = await db
    .select({ name: serviceTypes.name, value: count() })
    .from(services)
    .innerJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
    .where(eq(services.organizationId, organizationId))
    .groupBy(serviceTypes.name)
    .orderBy(desc(count()));
  return rows;
}

/** 4 cartes KPI de la maquette. "Participants (moyenne)"/"Taux de présence" utilisent les vraies
 * présences (`attendance_sessions.service_id` existe précisément pour ce cas — voir Phase 8) ;
 * "Équipes impliquées" = équipes réelles dont au moins un membre est un ouvrier affecté à un
 * service (`team_members` ⋈ `workers` ⋈ `service_assignments`), pas une notion inventée. */
export async function getServicesKpis(organizationId: string) {
  const cutoffYear = yearsAgoISO(1);
  const thisYearStart = yearStart(0);
  const lastYearStart = yearStart(1);

  const [
    [totalNow],
    [totalBefore],
    attendanceThisYear,
    attendanceLastYear,
    [teamsNow],
    [teamsBefore],
  ] = await Promise.all([
    db.select({ value: count() }).from(services).where(eq(services.organizationId, organizationId)),
    db.select({ value: count() }).from(services).where(and(eq(services.organizationId, organizationId), sql`${services.createdAt}::date <= ${cutoffYear}`)),
    db
      .select({ status: attendanceRecords.status, sessionId: attendanceRecords.sessionId })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .innerJoin(services, eq(services.id, attendanceSessions.serviceId))
      .where(and(eq(services.organizationId, organizationId), gte(services.startsAt, thisYearStart))),
    db
      .select({ status: attendanceRecords.status, sessionId: attendanceRecords.sessionId })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .innerJoin(services, eq(services.id, attendanceSessions.serviceId))
      .where(and(eq(services.organizationId, organizationId), gte(services.startsAt, lastYearStart), lt(services.startsAt, thisYearStart))),
    db
      .select({ value: countDistinct(teamMembers.teamId) })
      .from(serviceAssignments)
      .innerJoin(workers, eq(workers.id, serviceAssignments.workerId))
      .innerJoin(teamMembers, and(eq(teamMembers.personId, workers.personId), eq(teamMembers.status, "active"), eq(teamMembers.organizationId, organizationId)))
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(serviceAssignments.organizationId, organizationId)),
    db
      .select({ value: countDistinct(teamMembers.teamId) })
      .from(serviceAssignments)
      .innerJoin(services, eq(services.id, serviceAssignments.serviceId))
      .innerJoin(workers, eq(workers.id, serviceAssignments.workerId))
      .innerJoin(teamMembers, and(eq(teamMembers.personId, workers.personId), eq(teamMembers.status, "active"), eq(teamMembers.organizationId, organizationId)))
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(and(eq(serviceAssignments.organizationId, organizationId), sql`${services.startsAt}::date <= ${cutoffYear}`)),
  ]);

  function summarize(rows: { status: string; sessionId: string }[]) {
    const sessionIds = new Set(rows.map((r) => r.sessionId));
    const present = rows.filter((r) => r.status === "present").length;
    const total = rows.length;
    return {
      avgAttendance: sessionIds.size > 0 ? Math.round(present / sessionIds.size) : 0,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }
  const now = summarize(attendanceThisYear);
  const before = summarize(attendanceLastYear);

  return {
    total: { value: totalNow?.value ?? 0, deltaPct: pctDelta(totalNow?.value ?? 0, totalBefore?.value ?? 0) },
    avgAttendance: { value: now.avgAttendance, deltaPct: pctDelta(now.avgAttendance, before.avgAttendance) },
    attendanceRate: { value: now.rate, deltaPct: pctDelta(now.rate, before.rate) },
    teamsInvolved: { value: teamsNow?.value ?? 0, deltaPct: pctDelta(teamsNow?.value ?? 0, teamsBefore?.value ?? 0) },
  };
}

/** Version "toutes les affectations, groupées par service" de `getServiceAssignments` — utilisée
 * par la page liste pour peupler le dialogue d'affectations de chaque ligne sans une requête par
 * ligne. */
export async function getServiceAssignmentsForServices(organizationId: string, serviceIds: string[]) {
  const map = new Map<string, Awaited<ReturnType<typeof getServiceAssignments>>>();
  if (serviceIds.length === 0) return map;

  const rows = await db
    .select({
      id: serviceAssignments.id,
      serviceId: serviceAssignments.serviceId,
      workerId: serviceAssignments.workerId,
      role: serviceAssignments.role,
      status: serviceAssignments.status,
      notes: serviceAssignments.notes,
      firstName: people.firstName,
      lastName: people.lastName,
    })
    .from(serviceAssignments)
    .innerJoin(workers, eq(workers.id, serviceAssignments.workerId))
    .innerJoin(people, eq(people.id, workers.personId))
    .where(and(eq(serviceAssignments.organizationId, organizationId), inArray(serviceAssignments.serviceId, serviceIds)))
    .orderBy(asc(people.firstName));

  for (const r of rows) {
    const { serviceId, ...rest } = r;
    const list = map.get(serviceId) ?? [];
    list.push(rest);
    map.set(serviceId, list);
  }
  return map;
}

export async function getServiceAssignments(organizationId: string, serviceId: string) {
  return db
    .select({
      id: serviceAssignments.id,
      workerId: serviceAssignments.workerId,
      role: serviceAssignments.role,
      status: serviceAssignments.status,
      notes: serviceAssignments.notes,
      firstName: people.firstName,
      lastName: people.lastName,
    })
    .from(serviceAssignments)
    .innerJoin(workers, eq(workers.id, serviceAssignments.workerId))
    .innerJoin(people, eq(people.id, workers.personId))
    .where(and(eq(serviceAssignments.serviceId, serviceId), eq(serviceAssignments.organizationId, organizationId)))
    .orderBy(asc(people.firstName));
}
