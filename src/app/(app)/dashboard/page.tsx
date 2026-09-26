import { CalendarDays, HeartHandshake, MapPin, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardKpis, pastoralFollowUps, upcomingEvents } from "@/lib/demo-data";

const followUpStatusVariant = {
  Nouveau: "default",
  "En cours": "warning",
  "À relancer": "danger",
} as const;

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'église — données de démonstration en attendant la Phase 2 (base de données)."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-navy">{kpi.value}</p>
              <p className="mt-1 text-xs text-success">{kpi.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              Événements à venir
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.title}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{event.title}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="size-3" />
                    {event.location}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">{event.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="size-4 text-primary" />
              Suivis pastoraux
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pastoralFollowUps.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.assignedTo}</p>
                </div>
                <Badge variant={followUpStatusVariant[item.status]}>{item.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">ChurchOS AI Insights</p>
            <p className="mt-1 text-sm text-slate-600">
              L&apos;assistant IA arrive en Phase 15. Il pourra bientôt résumer vos tendances de
              présence, de dons et de suivi pastoral directement ici.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
