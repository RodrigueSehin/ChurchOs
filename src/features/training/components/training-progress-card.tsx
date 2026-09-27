import { Award } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ENROLLMENT_STATUS_LABELS } from "@/features/training/schemas";
import type { getTrainingSummaryForPerson } from "@/features/training/services";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  enrolled: "secondary",
  completed: "success",
  dropped: "danger",
  pending: "warning",
};

export function TrainingProgressCard({
  summary,
}: {
  summary: Awaited<ReturnType<typeof getTrainingSummaryForPerson>>;
}) {
  const { enrollments, certifications } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {enrollments.length === 0 ? (
          <EmptyState title="Aucune formation" description="Cette personne n'est inscrite à aucun cours." />
        ) : (
          <div className="flex flex-col gap-3">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-navy">{enrollment.courseTitle}</span>
                  <Badge variant={STATUS_VARIANT[enrollment.status] ?? "secondary"}>
                    {ENROLLMENT_STATUS_LABELS[enrollment.status] ?? enrollment.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Number(enrollment.progress)}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs text-slate-500">{Number(enrollment.progress)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {certifications.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-400">Certifications</p>
            {certifications.map((cert) => (
              <div key={cert.id} className="flex items-center gap-2 text-sm text-slate-600">
                <Award className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">{cert.name}</span>
                {cert.issuedAt && <span className="text-xs text-slate-400">({cert.issuedAt})</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
