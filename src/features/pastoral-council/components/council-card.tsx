import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPastoralCouncilDetail } from "@/features/pastoral-council/queries";
import { COUNCIL_STATUS_LABELS } from "@/features/pastoral-council/schemas";
import { CouncilFormDialog } from "@/features/pastoral-council/components/council-form-dialog";
import { DeleteCouncilButton } from "@/features/pastoral-council/components/delete-council-button";
import { CouncilMembersPanel } from "@/features/pastoral-council/components/council-members-panel";
import { CouncilActionsPanel } from "@/features/pastoral-council/components/council-actions-panel";
import type { pastoralCouncils } from "@/lib/db/schema";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  planned: "default",
  held: "success",
  cancelled: "secondary",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

export async function CouncilCard({
  organizationId,
  council,
  people,
  assignableUsers,
  canManage,
  isAdmin,
}: {
  organizationId: string;
  council: typeof pastoralCouncils.$inferSelect;
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const detail = await getPastoralCouncilDetail(organizationId, council.id);
  if (!detail) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-navy">{council.title}</p>
            <Badge variant={STATUS_VARIANT[council.status] ?? "secondary"}>{COUNCIL_STATUS_LABELS[council.status] ?? council.status}</Badge>
          </div>
          <p className="text-sm text-slate-400">{formatDateTime(council.meetingAt)}</p>
          {council.location && <p className="text-sm text-slate-400">{council.location}</p>}
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <CouncilFormDialog council={council} />
            {isAdmin && <DeleteCouncilButton id={council.id} title={council.title} />}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(council.agenda || council.minutes) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {council.agenda && (
              <div>
                <dt className="text-xs text-slate-400">Ordre du jour</dt>
                <dd className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{council.agenda}</dd>
              </div>
            )}
            {council.minutes && (
              <div>
                <dt className="text-xs text-slate-400">Compte-rendu</dt>
                <dd className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{council.minutes}</dd>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-4 lg:grid-cols-2">
          <CouncilMembersPanel
            councilId={council.id}
            members={detail.members}
            people={people}
            assignableUsers={assignableUsers}
            canManage={canManage}
            isAdmin={isAdmin}
          />
          <CouncilActionsPanel councilId={council.id} actions={detail.actions} assignableUsers={assignableUsers} canManage={canManage} />
        </div>
      </CardContent>
    </Card>
  );
}
