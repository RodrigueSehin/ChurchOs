"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCourse } from "@/features/training/actions";

export function DeleteCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCourse(courseId);
      if (res.error) setError(res.error);
      else router.push("/training");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="outline" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        }
        title="Supprimer ce cours ?"
        description={`"${courseTitle}" sera définitivement supprimé, avec ses modules, inscriptions et certifications liées.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
