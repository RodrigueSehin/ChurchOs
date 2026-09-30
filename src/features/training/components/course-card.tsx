import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, GraduationCap, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EnrollButton } from "@/features/training/components/enroll-button";
import { cn } from "@/lib/utils";
import type { getCourseCards } from "@/features/training/queries";

type CourseCardData = Awaited<ReturnType<typeof getCourseCards>>["rows"][number];

export function formatDuration(minutes: number) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}min`;
}

/** Carte d'un cours : visuel, titre, modules/durée, progression de l'utilisateur et bouton d'action. */
export function CourseCard({ course, canSelfEnroll }: { course: CourseCardData; canSelfEnroll: boolean }) {
  const progress = course.my?.progress ?? 0;
  const done = course.my?.status === "completed" || progress >= 100;
  const started = Boolean(course.my) && !done && progress > 0;
  const enrolled = Boolean(course.my) && course.my?.status !== "dropped";

  const action = done
    ? { label: "Terminé", className: "bg-success/10 text-success hover:bg-success/15", icon: CheckCircle2 }
    : started
      ? { label: "Continuer", className: "bg-navy text-white hover:bg-navy/90" }
      : enrolled
        ? { label: "Commencer", className: "bg-primary/10 text-primary hover:bg-primary/15" }
        : { label: course.status === "published" && !course.allowEnrollment ? "Inscriptions fermées" : "Voir le cours", className: "bg-slate-100 text-navy hover:bg-slate-200" };
  const showEnroll = !enrolled && canSelfEnroll && course.status === "published" && course.allowEnrollment;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/training/${course.id}`} className="relative block aspect-[16/9] bg-gradient-to-br from-navy to-primary">
        {course.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externe saisie dans le formulaire du cours
          <img src={course.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-white/70">
            <GraduationCap className="size-10" />
          </span>
        )}
        {course.status !== "published" && (
          <Badge variant="secondary" className="absolute left-2 top-2 bg-white/90">
            {course.status === "draft" ? "Brouillon" : "Archivé"}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/training/${course.id}`} className="font-semibold text-navy hover:underline">
          {course.title}
        </Link>
        <p className="line-clamp-2 min-h-8 text-xs text-slate-500">{course.description || "Aucune description."}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {course.moduleCount} module{course.moduleCount > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDuration(course.totalMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {course.enrollmentCount}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          {enrolled && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")} style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-500">{progress}%</span>
            </div>
          )}
          {showEnroll ? (
            <EnrollButton courseId={course.id} />
          ) : (
          <Link
            href={`/training/${course.id}`}
            className={cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors", action.className)}
          >
            {action.icon && <action.icon className="size-4" />}
            {action.label}
          </Link>
          )}
        </div>
      </div>
    </article>
  );
}
