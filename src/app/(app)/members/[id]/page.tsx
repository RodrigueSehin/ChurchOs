import Link from "next/link";
import { notFound } from "next/navigation";
import { Cake, Mail, MapPin, Pencil, Phone } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberDetail } from "@/features/members/queries";
import { GENDER_LABELS, MEMBER_STATUS_LABELS } from "@/features/members/schemas";
import { ArchiveMemberButton } from "@/features/members/components/archive-member-button";
import { getTrainingSummaryForPerson } from "@/features/training/services";
import { TrainingProgressCard } from "@/features/training/components/training-progress-card";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  active: "success",
  inactive: "secondary",
  transferred: "warning",
  deceased: "secondary",
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

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Membre" />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const { id } = await params;
  const detail = await getMemberDetail(check.organization.organization.id, id);
  if (!detail) notFound();

  const { member, person, campusName } = detail;
  const name = person.preferredName || `${person.firstName} ${person.lastName}`;
  const canUpdate = check.context.isAdmin || check.context.permissions.has("members.update");
  const canDelete = check.context.isAdmin || check.context.permissions.has("members.delete");
  // Gardé sur training.view (pas members.view, déjà vérifié plus haut pour toute la page) :
  // même précaution que /finance/reports en Phase 9 — ne pas exposer le suivi de formation à un
  // rôle qui voit les membres mais n'a pas accès au module Formations.
  const canViewTraining = check.context.isAdmin || check.context.permissions.has("training.view");
  const trainingSummary = canViewTraining
    ? await getTrainingSummaryForPerson(check.organization.organization.id, person.id)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name}
        description={`Membre depuis ${member.membershipDate ?? "—"}`}
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/members/${member.id}/edit`}>
                  <Pencil className="size-4" />
                  Modifier
                </Link>
              </Button>
            )}
            {canDelete && member.status !== "archived" && (
              <ArchiveMemberButton memberId={member.id} memberName={name} />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar className="size-20">
              {person.photoUrl && <AvatarImage src={person.photoUrl} alt="" />}
              <AvatarFallback className="text-xl">
                {person.firstName[0]}
                {person.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-navy">{name}</p>
              <Badge variant={STATUS_VARIANT[member.status] ?? "secondary"} className="mt-1">
                {MEMBER_STATUS_LABELS[member.status] ?? member.status}
              </Badge>
            </div>
            <div className="flex w-full flex-col gap-2 border-t border-slate-100 pt-3 text-left text-sm text-slate-500">
              {person.email && (
                <span className="flex items-center gap-2">
                  <Mail className="size-3.5 shrink-0" /> {person.email}
                </span>
              )}
              {person.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" /> {person.phone}
                </span>
              )}
              {person.city && (
                <span className="flex items-center gap-2">
                  <MapPin className="size-3.5 shrink-0" /> {person.city}
                </span>
              )}
              {person.birthDate && (
                <span className="flex items-center gap-2">
                  <Cake className="size-3.5 shrink-0" /> {person.birthDate}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Genre" value={GENDER_LABELS[person.gender] ?? person.gender} />
                <Field label="Statut marital" value={person.maritalStatus} />
                <Field label="Profession" value={person.occupation} />
                <Field label="Campus" value={campusName} />
                <Field label="Adresse" value={person.addressLine1} />
                <Field label="Contact d'urgence" value={person.emergencyContactName} />
              </dl>
              {person.notes && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <dt className="text-xs text-slate-400">Notes</dt>
                  <dd className="mt-1 text-sm text-slate-600">{person.notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adhésion</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Date de baptême" value={member.baptismDate} />
                <Field label="Date de conversion" value={member.salvationDate} />
                <Field label="Église précédente" value={member.previousChurch} />
                <Field label="Département" value={member.department} />
              </dl>
            </CardContent>
          </Card>

          {trainingSummary && <TrainingProgressCard summary={trainingSummary} />}
        </div>
      </div>
    </div>
  );
}
