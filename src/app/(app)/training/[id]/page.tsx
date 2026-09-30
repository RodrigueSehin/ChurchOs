import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourseCategories, getCourseDetail, getMyEnrollment, getPersonIdForUser } from "@/features/training/queries";
import { EnrollButton } from "@/features/training/components/enroll-button";
import { getPeopleForSelect } from "@/features/members/services";
import { updateCourse } from "@/features/training/actions";
import { COURSE_STATUS_LABELS } from "@/features/training/schemas";
import { CourseFormDialog } from "@/features/training/components/course-form-dialog";
import { CourseModulesPanel } from "@/features/training/components/course-modules-panel";
import { CourseEnrollmentsPanel } from "@/features/training/components/course-enrollments-panel";
import { CertificationsPanel } from "@/features/training/components/certifications-panel";
import { DeleteCourseButton } from "@/features/training/components/delete-course-button";

const STATUS_VARIANT: Record<string, "success" | "secondary"> = {
  draft: "secondary",
  published: "success",
  archived: "secondary",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("training.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Cours" />
        <PermissionDenied requiredPermission="training.view" />
      </div>
    );
  }

  const { id } = await params;
  const organizationId = check.organization.organization.id;
  const personId = await getPersonIdForUser(organizationId, check.user.email);
  const [detail, people, categories, myEnrollment] = await Promise.all([
    getCourseDetail(organizationId, id),
    getPeopleForSelect(organizationId),
    getCourseCategories(organizationId),
    getMyEnrollment(organizationId, id, personId),
  ]);
  if (!detail) notFound();

  const { course, instructor, modules, enrollments, certifications } = detail;
  const canManage = check.context.isAdmin || check.context.permissions.has("training.manage");
  const canEnroll = check.context.isAdmin || check.context.permissions.has("training.enroll");
  const canCertify = check.context.isAdmin || check.context.permissions.has("training.certify");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={course.title}
        description={<Badge variant={STATUS_VARIANT[course.status] ?? "secondary"}>{COURSE_STATUS_LABELS[course.status] ?? course.status}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {personId && !myEnrollment && course.status === "published" && course.allowEnrollment && (
              <EnrollButton courseId={course.id} />
            )}
            {canManage && (
              <CourseFormDialog
                action={updateCourse.bind(null, course.id)}
                people={people}
                categories={categories.map((c) => c.name)}
                moduleCount={modules.length}
                course={course}
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                }
              />
            )}
            {check.context.isAdmin && <DeleteCourseButton courseId={course.id} courseTitle={course.title} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Formateur" value={instructor ? `${instructor.firstName} ${instructor.lastName}` : null} />
              <Field label="Durée" value={course.durationMinutes ? `${course.durationMinutes} min` : null} />
            </dl>
            {course.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Description</dt>
                <dd className="mt-1 text-sm text-slate-600">{course.description}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <CourseModulesPanel courseId={course.id} modules={modules} canManage={canManage} isAdmin={check.context.isAdmin} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <CourseEnrollmentsPanel
              courseId={course.id}
              enrollments={enrollments}
              people={people}
              canManage={canEnroll}
              isAdmin={check.context.isAdmin}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <CertificationsPanel
              courseId={course.id}
              certifications={certifications}
              people={people}
              canManage={canCertify}
              isAdmin={check.context.isAdmin}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
