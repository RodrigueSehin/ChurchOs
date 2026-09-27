import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getEventCategories } from "@/features/events/queries";
import { createEvent } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";

export default async function NewEventPage() {
  const check = await checkPermission("events.create");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouvel événement" />
        <PermissionDenied requiredPermission="events.create" />
      </div>
    );
  }

  const categories = await getEventCategories(check.organization.organization.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nouvel événement" description="Créez un nouvel événement pour votre église." />
      <EventForm action={createEvent} categories={categories} cancelHref="/events" />
    </div>
  );
}
