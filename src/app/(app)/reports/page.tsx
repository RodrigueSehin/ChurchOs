import { FileSpreadsheet, FileText, Table2 } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ExportButtons({ type }: { type: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="secondary" size="sm">
        <a href={`/api/reports/${type}?format=csv`} download>
          <Table2 className="size-4" />
          CSV
        </a>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <a href={`/api/reports/${type}?format=xlsx`} download>
          <FileSpreadsheet className="size-4" />
          Excel
        </a>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <a href={`/api/reports/${type}?format=pdf`} download>
          <FileText className="size-4" />
          PDF
        </a>
      </Button>
    </div>
  );
}

export default async function ReportsPage() {
  const check = await checkPermission("reports.export");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Rapports" description="Rapports exportables (PDF, Excel, CSV) sur l'ensemble des modules." />
        <PermissionDenied requiredPermission="reports.export" />
      </div>
    );
  }

  const canAny = (code: string) => check.context.isAdmin || check.context.permissions.has(code);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rapports" description="Rapports exportables (PDF, Excel, CSV) sur l'ensemble des modules." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canAny("members.view") && (
          <Card>
            <CardHeader>
              <CardTitle>Rapport des membres</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">Liste complète des membres : coordonnées, statut, date d&apos;adhésion, campus.</p>
              <ExportButtons type="members" />
            </CardContent>
          </Card>
        )}

        {canAny("attendance.view") && (
          <Card>
            <CardHeader>
              <CardTitle>Rapport de présence</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">Toutes les sessions de présence enregistrées, avec le nombre de présents.</p>
              <ExportButtons type="attendance" />
            </CardContent>
          </Card>
        )}

        {canAny("finance.view") && (
          <Card>
            <CardHeader>
              <CardTitle>Rapport financier</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">Recettes et dépenses par catégorie, depuis le 1er janvier de l&apos;année en cours.</p>
              <ExportButtons type="finance" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
