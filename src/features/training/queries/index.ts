import "server-only";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { certifications, courseEnrollments, courseModules, courses, people } from "@/lib/db/schema";

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
}: {
  organizationId: string;
  personId: string | null;
  search?: string;
  view?: string;
  sort?: string;
  page?: number;
}) {
  const conditions = [eq(courses.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(courses.title, `%${search.trim()}%`));

  const baseRows = await db
    .select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      status: courses.status,
      imageUrl: courses.imageUrl,
      durationMinutes: courses.durationMinutes,
      createdAt: courses.createdAt,
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
