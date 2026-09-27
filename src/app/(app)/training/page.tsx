import { GraduationCap } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { Card } from "@/components/ui/card";
import { getCourses } from "@/features/training/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createCourse } from "@/features/training/actions";
import { CoursesTable } from "@/features/training/components/courses-table";
import { CourseFormDialog } from "@/features/training/components/course-form-dialog";

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const check = await checkPermission("training.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Cours & discipolat" description="Cours, modules, inscriptions, progression et certifications." />
        <PermissionDenied requiredPermission="training.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("training.manage") || check.context.isAdmin;

  const [{ rows, total, pageSize }, people] = await Promise.all([
    getCourses({ organizationId, search: params.q, page }),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cours & discipolat"
        description="Cours, modules, inscriptions, progression et certifications."
        actions={canCreate ? <CourseFormDialog action={createCourse} people={people} /> : undefined}
      />

      <SearchBox initialValue={params.q ?? ""} placeholder="Rechercher un cours..." />

      <Card>
        {rows.length === 0 ? (
          params.q ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={GraduationCap} title="Aucun cours" description="Créez le premier cours de votre église." className="border-0" />
          )
        ) : (
          <>
            <CoursesTable rows={rows} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                sp.set("page", String(p));
                return `/training?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
