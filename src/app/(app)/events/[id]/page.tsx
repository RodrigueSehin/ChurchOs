import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, QrCode } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEventCategories, getEventDetail } from "@/features/events/queries";
import { EVENT_STATUS_LABELS, EVENT_VISIBILITY_LABELS } from "@/features/events/schemas";
import { EventEditDialog } from "@/features/events/components/event-edit-dialog";
import { DeleteEventButton } from "@/features/events/components/delete-event-button";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger" | "default"> = {
  draft: "secondary",
  published: "success",
  cancelled: "danger",
  completed: "default",
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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("events.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Événement" />
        <PermissionDenied requiredPermission="events.view" />
      </div>
    );
  }

  const { id } = await params;
  const organizationId = check.organization.organization.id;
  const [detail, categories] = await Promise.all([
    getEventDetail(organizationId, id),
    getEventCategories(organizationId),
  ]);
  if (!detail) notFound();

  const { event, categoryName, registrationCount } = detail;
  const canUpdate = check.context.isAdmin || check.context.permissions.has("events.update");
  const canDelete = check.context.isAdmin || check.context.permissions.has("events.delete");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[event.status] ?? "secondary"}>{EVENT_STATUS_LABELS[event.status] ?? event.status}</Badge>
            {categoryName && <Badge variant="secondary">{categoryName}</Badge>}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && <EventEditDialog event={event} categories={categories} />}
            {canDelete && <DeleteEventButton eventId={event.id} eventTitle={event.title} />}
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
              <Field label="Date de début" value={formatDateTime(event.startsAt)} />
              <Field label="Date de fin" value={event.endsAt ? formatDateTime(event.endsAt) : null} />
              <Field label="Lieu" value={event.location} />
              <Field label="Visibilité" value={EVENT_VISIBILITY_LABELS[event.visibility] ?? event.visibility} />
              <Field label="Capacité" value={event.capacity} />
              <Field label="Prix" value={Number(event.price) > 0 ? `${event.price} ${event.currency}` : "Gratuit"} />
            </dl>
            {event.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Description</dt>
                <dd className="mt-1 text-sm text-slate-600">{event.description}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inscriptions & présences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {event.registrationEnabled ? (
              <p className="text-sm text-slate-500">
                <strong className="text-navy">{registrationCount}</strong> inscription(s) enregistrée(s).
              </p>
            ) : (
              <p className="text-sm text-slate-400">Les inscriptions ne sont pas activées pour cet événement.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/registrations?eventId=${event.id}`}>
                  <ClipboardList className="size-4" />
                  Voir les inscriptions
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/attendance?eventId=${event.id}`}>
                  <QrCode className="size-4" />
                  Gérer les présences
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
