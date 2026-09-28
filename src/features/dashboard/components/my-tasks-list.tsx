import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { MyTaskItem } from "@/features/dashboard/queries";

function formatDue(dueDate: string | null) {
  if (!dueDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (dueDate === today) return "Aujourd'hui";
  if (dueDate === tomorrow) return "Demain";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(dueDate));
}

export function MyTasksList({ items }: { items: MyTaskItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucune tâche en attente.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const due = formatDue(item.dueDate);
        return (
          <div key={item.id} className="flex items-center gap-3">
            <Checkbox checked={false} disabled className="shrink-0" />
            <p className="min-w-0 flex-1 truncate text-sm text-navy">{item.title}</p>
            {item.priority === "urgent" && <Badge variant="danger">Urgent</Badge>}
            {item.priority === "high" && <Badge variant="warning">Important</Badge>}
            {due && <span className="shrink-0 text-xs text-slate-400">{due}</span>}
          </div>
        );
      })}
    </div>
  );
}
