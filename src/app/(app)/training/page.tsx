import Link from "next/link";
import { Award, BookOpen, GraduationCap, Quote, TrendingUp, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCourseCards,
  getCourseCategories,
  getInstructors,
  getMyTrainingOverview,
  getPersonIdForUser,
  getRecentCourses,
  getTrainingKpis,
} from "@/features/training/queries";
import { COURSE_STATUS_LABELS } from "@/features/training/schemas";
import { getPeopleForSelect } from "@/features/members/services";
import { createCourse } from "@/features/training/actions";
import { CourseCard } from "@/features/training/components/course-card";
import { CourseCategoryManager } from "@/features/training/components/course-category-manager";
import { CoursesToolbar } from "@/features/training/components/courses-toolbar";
import { MyProgressCard } from "@/features/training/components/my-progress-card";
import { CourseFormDialog } from "@/features/training/components/course-form-dialog";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

const HERO = {
  title: "Cours & Discipolat",
  description: "Grandissez dans la connaissance de la Parole et devenez des disciples.",
  quote: "Allez, faites de toutes les nations des disciples…",
  verseRef: "Matthieu 28:19",
};

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; view?: string; sort?: string }>;
}) {
  const check = await checkPermission("training.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <PermissionDenied requiredPermission="training.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const view = ["inprogress", "done", "mine"].includes(params.view ?? "") ? (params.view as string) : "";
  const sort = params.sort === "title" ? "title" : "recent";
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("training.manage") || check.context.isAdmin;

  const personId = await getPersonIdForUser(organizationId, check.user.email);

  const [kpis, cards, overview, recent, instructors, people, categories] = await Promise.all([
    getTrainingKpis(organizationId),
    getCourseCards({ organizationId, personId, search: params.q, view, sort, page, includeHidden: canCreate }),
    personId ? getMyTrainingOverview(organizationId, personId) : Promise.resolve(null),
    getRecentCourses(organizationId, 4),
    getInstructors(organizationId, 4),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    getCourseCategories(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        {...HERO}
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <CourseCategoryManager categories={categories} />
              <CourseFormDialog action={createCourse} people={people} categories={categories.map((c) => c.name)} />
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={BookOpen}
          iconClassName="bg-blue-100 text-blue-600"
          label="Cours disponibles"
          value={n(kpis.publishedCourses.value)}
          delta={kpis.publishedCourses.newThisMonth}
          deltaSuffix=""
          periodLabel="ajoutés ce mois-ci"
        />
        <KpiCard
          icon={Users}
          iconClassName="bg-green-100 text-green-600"
          label="Apprenants actifs"
          value={n(kpis.activeLearners.value)}
          delta={kpis.activeLearners.newThisMonth}
          deltaSuffix=""
          periodLabel="inscrits ce mois-ci"
        />
        <KpiCard
          icon={Award}
          iconClassName="bg-purple-100 text-purple-600"
          label="Certifications délivrées"
          value={n(kpis.certifications.value)}
          delta={kpis.certifications.newThisMonth}
          deltaSuffix=""
          periodLabel="ce mois-ci"
        />
        <KpiCard
          icon={TrendingUp}
          iconClassName="bg-amber-100 text-amber-600"
          label="Taux de complétion"
          value={`${n(kpis.completionRate)}%`}
          periodLabel="inscriptions terminées"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="flex flex-col gap-5 pt-5">
            <CoursesToolbar view={view} sort={sort} initialSearch={params.q ?? ""} counts={cards.counts} />

            {cards.rows.length === 0 ? (
              params.q || view ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={GraduationCap} title="Aucun cours" description="Créez le premier cours de votre église." className="border-0" />
              )
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.rows.map((course) => (
                  <CourseCard key={course.id} course={course} canSelfEnroll={Boolean(personId)} />
                ))}
              </div>
            )}

            <Pagination
              page={page}
              pageSize={cards.pageSize}
              total={cards.total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (view) sp.set("view", view);
                if (sort !== "recent") sp.set("sort", sort);
                sp.set("page", String(p));
                return `/training?${sp.toString()}`;
              }}
            />
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-6">
          {overview && <MyProgressCard overview={overview} />}

          <Card>
            <CardContent className="flex gap-3 pt-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Quote className="size-4" />
              </span>
              <div className="text-sm italic text-slate-600">
                « Croissez dans la grâce et dans la connaissance de notre Seigneur et Sauveur Jésus-Christ. »
                <p className="mt-1 text-xs not-italic text-slate-400">2 Pierre 3:18</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cours récents</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun cours pour le moment.</p>
              ) : (
                recent.map((course) => (
                  <Link key={course.id} href={`/training/${course.id}`} className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-navy to-primary text-white/80">
                      {course.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL externe saisie dans le formulaire du cours
                        <img src={course.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <GraduationCap className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy">{course.title}</span>
                      <span className="block text-xs text-slate-400">
                        Ajouté le {new Intl.DateTimeFormat("fr-FR").format(course.createdAt)}
                      </span>
                    </span>
                    <Badge variant={course.status === "published" ? "success" : "secondary"}>
                      {COURSE_STATUS_LABELS[course.status] ?? course.status}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formateurs</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {instructors.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun formateur assigné.</p>
              ) : (
                instructors.map((i) => (
                  <div key={i.personId} className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {i.photoUrl && <AvatarImage src={i.photoUrl} alt="" />}
                      <AvatarFallback>{`${i.firstName[0] ?? ""}${i.lastName[0] ?? ""}`.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">
                      {i.firstName} {i.lastName}
                    </span>
                    <Badge variant="secondary">
                      {i.courseCount} cours
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
