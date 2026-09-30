import "server-only";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { certifications, courseCategories, courseEnrollments, courseModules, courses, people } from "@/lib/db/schema";
import { DEFAULT_COURSE_CATEGORIES } from "@/features/training/schemas";

export async function getCourseDetail(organizationId: string, courseId: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.organizationId, organizationId)));
  if (!course) return null;

  const instructor = course.instructorPersonId
    ? (
        await db
          .select({ firstName: people.firstName, lastName: people.lastName })
          .from(people)
          .where(eq(people.id, course.instructorPersonId))
      )[0]
    : null;

  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(asc(courseModules.sortOrder), asc(courseModules.createdAt));

  const enrollments = await db
    .select({
      id: courseEnrollments.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      status: courseEnrollments.status,
      progress: courseEnrollments.progress,
      enrolledAt: courseEnrollments.enrolledAt,
      completedAt: courseEnrollments.completedAt,
    })
    .from(courseEnrollments)
    .innerJoin(people, eq(people.id, courseEnrollments.personId))
    .where(eq(courseEnrollments.courseId, courseId))
    .orderBy(asc(people.firstName));

  const courseCertifications = await db
    .select({
      id: certifications.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      name: certifications.name,
      certificateNumber: certifications.certificateNumber,
      issuedAt: certifications.issuedAt,
      expiresAt: certifications.expiresAt,
      credentialUrl: certifications.credentialUrl,
    })
    .from(certifications)
    .innerJoin(people, eq(people.id, certifications.personId))
    .where(eq(certifications.courseId, courseId))
    .orderBy(desc(certifications.issuedAt));

  return { course, instructor, modules, enrollments, certifications: courseCertifications };
}

/** Suivi de progression + certifications d'une personne — consommé par la fiche membre
 * (critère de sortie explicite de cette phase), via la façade `features/training/services`. */
export async function getTrainingSummaryForPerson(organizationId: string, personId: string) {
  const enrollments = await db
    .select({
      id: courseEnrollments.id,
      courseId: courses.id,
      courseTitle: courses.title,
      status: courseEnrollments.status,
      progress: courseEnrollments.progress,
      enrolledAt: courseEnrollments.enrolledAt,
      completedAt: courseEnrollments.completedAt,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .where(and(eq(courseEnrollments.organizationId, organizationId), eq(courseEnrollments.personId, personId)))
    .orderBy(desc(courseEnrollments.enrolledAt));

  const personCertifications = await db
    .select({
      id: certifications.id,
      name: certifications.name,
      certificateNumber: certifications.certificateNumber,
      issuedAt: certifications.issuedAt,
      expiresAt: certifications.expiresAt,
      credentialUrl: certifications.credentialUrl,
    })
    .from(certifications)
    .where(and(eq(certifications.organizationId, organizationId), eq(certifications.personId, personId)))
    .orderBy(desc(certifications.issuedAt));

  return { enrollments, certifications: personCertifications };
}

/* ------------------------------------------------------------------ */
/* Page /training (refonte) : cartes de cours, KPI, parcours perso      */
/* ------------------------------------------------------------------ */

export const COURSE_CARDS_PAGE_SIZE = 8;

/** Personne de l'organisation correspondant à l'utilisateur connecté. Aucun lien direct
 * `people` ↔ compte n'existe dans le schéma : on rapproche par email (insensible à la casse). */
export async function getPersonIdForUser(organizationId: string, email: string | null | undefined) {
  if (!email) return null;
  const [row] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.organizationId, organizationId), sql`lower(${people.email}) = ${email.toLowerCase()}`))
    .limit(1);
  return row?.id ?? null;
}

export async function getTrainingKpis(organizationId: string) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [[courseStats], [learnerStats], [enrollmentStats], [certStats]] = await Promise.all([
    db
      .select({
        published: sql<number>`count(*) filter (where ${courses.status} = 'published')::int`,
        newThisMonth: sql<number>`count(*) filter (where ${courses.status} = 'published' and ${courses.createdAt} >= ${monthStart.toISOString()})::int`,
      })
      .from(courses)
      .where(eq(courses.organizationId, organizationId)),
    db
      .select({
        active: sql<number>`count(distinct ${courseEnrollments.personId}) filter (where ${courseEnrollments.status} = 'enrolled')::int`,
        newThisMonth: sql<number>`count(distinct ${courseEnrollments.personId}) filter (where ${courseEnrollments.status} = 'enrolled' and ${courseEnrollments.enrolledAt} >= ${monthStart.toISOString()})::int`,
      })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.organizationId, organizationId)),
    db
      .select({
        total: sql<number>`count(*) filter (where ${courseEnrollments.status} <> 'dropped')::int`,
        completed: sql<number>`count(*) filter (where ${courseEnrollments.status} = 'completed')::int`,
      })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.organizationId, organizationId)),
    db
      .select({
        total: count(),
        newThisMonth: sql<number>`count(*) filter (where ${certifications.createdAt} >= ${monthStart.toISOString()})::int`,
      })
      .from(certifications)
      .where(eq(certifications.organizationId, organizationId)),
  ]);

  const total = enrollmentStats?.total ?? 0;
  return {
    publishedCourses: { value: courseStats?.published ?? 0, newThisMonth: courseStats?.newThisMonth ?? 0 },
    activeLearners: { value: learnerStats?.active ?? 0, newThisMonth: learnerStats?.newThisMonth ?? 0 },
    certifications: { value: certStats?.total ?? 0, newThisMonth: certStats?.newThisMonth ?? 0 },
    completionRate: total === 0 ? 0 : Math.round(((enrollmentStats?.completed ?? 0) / total) * 100),
  };
}

export type CourseView = "" | "inprogress" | "done" | "mine";

export async function getCourseCards({
  organizationId,
  personId,
  search,
  view = "",
  sort = "recent",
  page = 1,
  includeHidden = false,
}: {
  organizationId: string;
  personId: string | null;
  /** Les gestionnaires voient aussi les cours masqués de la bibliothèque (`show_in_library = false`). */
  includeHidden?: boolean;
  search?: string;
  view?: string;
  sort?: string;
  page?: number;
}) {
  const conditions = [eq(courses.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(courses.title, `%${search.trim()}%`));
  if (!includeHidden) conditions.push(eq(courses.showInLibrary, true));

  const baseRows = await db
    .select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      status: courses.status,
      imageUrl: courses.imageUrl,
      durationMinutes: courses.durationMinutes,
      createdAt: courses.createdAt,
      allowEnrollment: courses.allowEnrollment,
      instructorFirstName: people.firstName,
      instructorLastName: people.lastName,
    })
    .from(courses)
    .leftJoin(people, eq(people.id, courses.instructorPersonId))
    .where(and(...conditions))
    .orderBy(sort === "title" ? asc(courses.title) : desc(courses.createdAt));

  const [moduleStats, enrollmentCounts, mine] = await Promise.all([
    db
      .select({
        courseId: courseModules.courseId,
        modules: count(),
        minutes: sql<number>`coalesce(sum(${courseModules.durationMinutes}), 0)::int`,
      })
      .from(courseModules)
      .where(eq(courseModules.organizationId, organizationId))
      .groupBy(courseModules.courseId),
    db
      .select({ courseId: courseEnrollments.courseId, value: count() })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.organizationId, organizationId))
      .groupBy(courseEnrollments.courseId),
    personId
      ? db
          .select({ courseId: courseEnrollments.courseId, status: courseEnrollments.status, progress: courseEnrollments.progress })
          .from(courseEnrollments)
          .where(and(eq(courseEnrollments.organizationId, organizationId), eq(courseEnrollments.personId, personId)))
      : Promise.resolve([]),
  ]);

  const modulesByCourse = new Map(moduleStats.map((m) => [m.courseId, m]));
  const enrolledByCourse = new Map(enrollmentCounts.map((e) => [e.courseId, e.value]));
  const mineByCourse = new Map(mine.map((m) => [m.courseId, { status: m.status, progress: Math.round(Number(m.progress)) }]));

  const all = baseRows.map((r) => {
    const mod = modulesByCourse.get(r.id);
    const my = mineByCourse.get(r.id) ?? null;
    return {
      ...r,
      moduleCount: mod?.modules ?? 0,
      // Durée réelle = somme des modules ; à défaut, la durée saisie sur le cours.
      totalMinutes: mod && mod.minutes > 0 ? mod.minutes : (r.durationMinutes ?? 0),
      enrollmentCount: enrolledByCourse.get(r.id) ?? 0,
      my,
    };
  });

  const isDone = (c: (typeof all)[number]) => c.my?.status === "completed" || (c.my?.progress ?? 0) >= 100;
  const counts = {
    all: all.length,
    inprogress: all.filter((c) => c.my && c.my.status !== "dropped" && !isDone(c)).length,
    done: all.filter(isDone).length,
    mine: all.filter((c) => c.my && c.my.status !== "dropped").length,
  };

  const filtered =
    view === "inprogress"
      ? all.filter((c) => c.my && c.my.status !== "dropped" && !isDone(c))
      : view === "done"
        ? all.filter(isDone)
        : view === "mine"
          ? all.filter((c) => c.my && c.my.status !== "dropped")
          : all;

  return {
    rows: filtered.slice((page - 1) * COURSE_CARDS_PAGE_SIZE, page * COURSE_CARDS_PAGE_SIZE),
    total: filtered.length,
    pageSize: COURSE_CARDS_PAGE_SIZE,
    counts,
  };
}

/** Synthèse « Mon parcours » : cours terminés / en cours / non commencés parmi les cours publiés. */
export async function getMyTrainingOverview(organizationId: string, personId: string) {
  const [[pub], enrollments] = await Promise.all([
    db
      .select({ value: count() })
      .from(courses)
      .where(and(eq(courses.organizationId, organizationId), eq(courses.status, "published"))),
    db
      .select({ status: courseEnrollments.status, progress: courseEnrollments.progress })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .where(
        and(
          eq(courseEnrollments.organizationId, organizationId),
          eq(courseEnrollments.personId, personId),
          eq(courses.status, "published"),
        ),
      ),
  ]);
  const active = enrollments.filter((e) => e.status !== "dropped");
  const done = active.filter((e) => e.status === "completed" || Number(e.progress) >= 100).length;
  const inProgress = active.length - done;
  const total = pub?.value ?? 0;
  return { total, done, inProgress, notStarted: Math.max(0, total - done - inProgress) };
}

export async function getRecentCourses(organizationId: string, limit = 4) {
  return db
    .select({ id: courses.id, title: courses.title, status: courses.status, imageUrl: courses.imageUrl, createdAt: courses.createdAt })
    .from(courses)
    .where(eq(courses.organizationId, organizationId))
    .orderBy(desc(courses.createdAt))
    .limit(limit);
}

export async function getInstructors(organizationId: string, limit = 4) {
  return db
    .select({
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      photoUrl: people.photoUrl,
      courseCount: count(),
    })
    .from(courses)
    .innerJoin(people, eq(people.id, courses.instructorPersonId))
    .where(eq(courses.organizationId, organizationId))
    .groupBy(people.id, people.firstName, people.lastName, people.photoUrl)
    .orderBy(desc(count()))
    .limit(limit);
}

/** Catégories de l'organisation ; une organisation qui n'en a aucune reçoit les catégories par défaut
 * (insertion idempotente, `unique (organization_id, name)`). */
export async function getCourseCategories(organizationId: string) {
  const list = () =>
    db
      .select({ id: courseCategories.id, name: courseCategories.name })
      .from(courseCategories)
      .where(eq(courseCategories.organizationId, organizationId))
      .orderBy(asc(courseCategories.name));

  const existing = await list();
  if (existing.length > 0) return existing;
  await db
    .insert(courseCategories)
    .values(DEFAULT_COURSE_CATEGORIES.map((name) => ({ organizationId, name })))
    .onConflictDoNothing();
  return list();
}

export async function getMyEnrollment(organizationId: string, courseId: string, personId: string | null) {
  if (!personId) return null;
  const [row] = await db
    .select({ status: courseEnrollments.status, progress: courseEnrollments.progress })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.organizationId, organizationId),
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.personId, personId),
      ),
    );
  return row ?? null;
}

/* ------------------------------------------------------------------ */
/* Page /training/certifications                                       */
/* ------------------------------------------------------------------ */

export const CERTIFICATIONS_PAGE_SIZE = 10;

export type CertificationStatus = "obtained" | "pending" | "expired";

/** Statut dérivé (aucune colonne dédiée) : expirée si `expires_at` est passé ; en cours tant qu'elle
 * n'a pas de date d'obtention passée ; obtenue sinon. */
const CERT_STATUS_SQL = sql<CertificationStatus>`case
  when ${certifications.status} = 'pending' then 'pending'
  when ${certifications.status} = 'expired'
    or (${certifications.expiresAt} is not null and ${certifications.expiresAt} < current_date) then 'expired'
  else 'obtained' end`;

/** Qui voit quoi : les responsables (admin / `training.certify` / `training.manage`) voient tout ; les
 * autres, les certifications « toute l'église » et les leurs quand elles sont « visibles par le membre ». */
export interface CertificationViewer {
  canSeeAll: boolean;
  personId: string | null;
}

function visibilityCondition(viewer: CertificationViewer) {
  if (viewer.canSeeAll) return undefined;
  return viewer.personId
    ? or(
        eq(certifications.visibility, "organization"),
        and(eq(certifications.visibility, "member"), eq(certifications.personId, viewer.personId)),
      )
    : eq(certifications.visibility, "organization");
}

export async function getCertificationStats(organizationId: string, viewer: CertificationViewer) {
  const year = new Date().getUTCFullYear();
  const effectiveDate = sql`coalesce(${certifications.issuedAt}, ${certifications.createdAt}::date)`;
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      members: sql<number>`count(distinct ${certifications.personId})::int`,
      programs: sql<number>`count(distinct ${certifications.courseId})::int`,
      obtained: sql<number>`count(*) filter (where ${CERT_STATUS_SQL} = 'obtained')::int`,
      pending: sql<number>`count(*) filter (where ${CERT_STATUS_SQL} = 'pending')::int`,
      expired: sql<number>`count(*) filter (where ${CERT_STATUS_SQL} = 'expired')::int`,
      thisYear: sql<number>`count(*) filter (where extract(year from ${effectiveDate}) = ${year})::int`,
      lastYear: sql<number>`count(*) filter (where extract(year from ${effectiveDate}) = ${year - 1})::int`,
    })
    .from(certifications)
    .where(and(eq(certifications.organizationId, organizationId), visibilityCondition(viewer)));

  const total = row?.total ?? 0;
  const lastYear = row?.lastYear ?? 0;
  return {
    total,
    members: row?.members ?? 0,
    programs: row?.programs ?? 0,
    obtained: row?.obtained ?? 0,
    pending: row?.pending ?? 0,
    expired: row?.expired ?? 0,
    successRate: total === 0 ? 0 : Math.round(((row?.obtained ?? 0) / total) * 100),
    /** Variation du nombre de certifications de l'année civile vs la précédente (`null` si pas de base de comparaison). */
    yearDeltaPct: lastYear === 0 ? null : Math.round((((row?.thisYear ?? 0) - lastYear) / lastYear) * 100),
  };
}

export async function getCertificationsList({
  organizationId,
  viewer,
  search,
  status,
  page = 1,
}: {
  organizationId: string;
  viewer: CertificationViewer;
  search?: string;
  status?: string;
  page?: number;
}) {
  const conditions = [eq(certifications.organizationId, organizationId)];
  const visible = visibilityCondition(viewer);
  if (visible) conditions.push(visible);
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(certifications.name, term),
        ilike(people.firstName, term),
        ilike(people.lastName, term),
        ilike(courses.title, term),
      )!,
    );
  }
  if (status === "obtained" || status === "pending" || status === "expired") {
    conditions.push(sql`${CERT_STATUS_SQL} = ${status}`);
  }
  const where = and(...conditions);

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: certifications.id,
        name: certifications.name,
        certificateNumber: certifications.certificateNumber,
        issuedAt: certifications.issuedAt,
        expiresAt: certifications.expiresAt,
        credentialUrl: certifications.credentialUrl,
        hasFile: sql<boolean>`${certifications.filePath} is not null`,
        courseId: courses.id,
        courseTitle: courses.title,
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        photoUrl: people.photoUrl,
        status: CERT_STATUS_SQL,
      })
      .from(certifications)
      .innerJoin(people, eq(people.id, certifications.personId))
      .leftJoin(courses, eq(courses.id, certifications.courseId))
      .where(where)
      .orderBy(desc(sql`coalesce(${certifications.issuedAt}, ${certifications.createdAt}::date)`), desc(certifications.createdAt))
      .limit(CERTIFICATIONS_PAGE_SIZE)
      .offset((page - 1) * CERTIFICATIONS_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(certifications)
      .innerJoin(people, eq(people.id, certifications.personId))
      .leftJoin(courses, eq(courses.id, certifications.courseId))
      .where(where),
  ]);

  return { rows, total: totalRow?.value ?? 0, pageSize: CERTIFICATIONS_PAGE_SIZE };
}

/** Répartition par programme (cours) : les 5 plus fréquents, le reste regroupé en « Autres ». */
export async function getCertificationsByProgram(organizationId: string, viewer: CertificationViewer) {
  const rows = await db
    .select({ title: sql<string>`coalesce(${courses.title}, 'Sans programme')`, value: sql<number>`count(*)::int` })
    .from(certifications)
    .leftJoin(courses, eq(courses.id, certifications.courseId))
    .where(and(eq(certifications.organizationId, organizationId), visibilityCondition(viewer)))
    .groupBy(sql`coalesce(${courses.title}, 'Sans programme')`)
    .orderBy(desc(sql`count(*)`));
  const top = rows.slice(0, 5);
  const others = rows.slice(5).reduce((sum, r) => sum + r.value, 0);
  return others > 0 ? [...top, { title: "Autres", value: others }] : top;
}

export async function getRecentCertifications(organizationId: string, viewer: CertificationViewer, limit = 3) {
  return db
    .select({
      id: certifications.id,
      name: certifications.name,
      issuedAt: certifications.issuedAt,
      firstName: people.firstName,
      lastName: people.lastName,
      photoUrl: people.photoUrl,
      status: CERT_STATUS_SQL,
    })
    .from(certifications)
    .innerJoin(people, eq(people.id, certifications.personId))
    .where(and(eq(certifications.organizationId, organizationId), visibilityCondition(viewer)))
    .orderBy(desc(sql`coalesce(${certifications.issuedAt}, ${certifications.createdAt}::date)`), desc(certifications.createdAt))
    .limit(limit);
}

/** Cours pour le sélecteur « Programme / cours » du formulaire de certification. */
export async function getCoursesForSelect(organizationId: string) {
  return db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.organizationId, organizationId))
    .orderBy(asc(courses.title));
}
