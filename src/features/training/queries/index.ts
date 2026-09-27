import "server-only";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { certifications, courseEnrollments, courseModules, courses, people } from "@/lib/db/schema";

export const COURSES_PAGE_SIZE = 20;

export async function getCourses({
  organizationId,
  search,
  page = 1,
}: {
  organizationId: string;
  search?: string;
  page?: number;
}) {
  const conditions = [eq(courses.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(courses.title, `%${search.trim()}%`));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: courses.id,
        title: courses.title,
        status: courses.status,
        durationMinutes: courses.durationMinutes,
        instructorFirstName: people.firstName,
        instructorLastName: people.lastName,
      })
      .from(courses)
      .leftJoin(people, eq(people.id, courses.instructorPersonId))
      .where(where)
      .orderBy(asc(courses.title))
      .limit(COURSES_PAGE_SIZE)
      .offset((page - 1) * COURSES_PAGE_SIZE),
    db.select({ value: count() }).from(courses).where(where),
  ]);

  const courseIds = rows.map((r) => r.id);
  const enrollmentCounts = courseIds.length
    ? await db
        .select({ courseId: courseEnrollments.courseId, value: count() })
        .from(courseEnrollments)
        .where(eq(courseEnrollments.organizationId, organizationId))
        .groupBy(courseEnrollments.courseId)
    : [];
  const countByCourse = new Map(enrollmentCounts.map((e) => [e.courseId, e.value]));

  return {
    rows: rows.map((r) => ({ ...r, enrollmentCount: countByCourse.get(r.id) ?? 0 })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: COURSES_PAGE_SIZE,
  };
}

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
