import Link from "next/link";
import { BarChart3, CalendarPlus, Coins, HandHeart, Megaphone, UserPlus } from "lucide-react";

interface QuickAction {
  key: string;
  href: string;
  label: string;
  icon: React.ElementType;
  className: string;
  allowed: boolean;
}

export function QuickActions({
  canCreateMember,
  canCreateEvent,
  canCreateFinance,
  canManageCommunication,
  canCreatePrayer,
  canViewReports,
}: {
  canCreateMember: boolean;
  canCreateEvent: boolean;
  canCreateFinance: boolean;
  canManageCommunication: boolean;
  canCreatePrayer: boolean;
  canViewReports: boolean;
}) {
  const actions: QuickAction[] = [
    { key: "member", href: "/members/new", label: "Ajouter un membre", icon: UserPlus, className: "bg-blue-50 text-blue-700 hover:bg-blue-100", allowed: canCreateMember },
    { key: "event", href: "/events/new", label: "Planifier un événement", icon: CalendarPlus, className: "bg-green-50 text-green-700 hover:bg-green-100", allowed: canCreateEvent },
    { key: "offering", href: "/finance/income", label: "Enregistrer une offrande", icon: Coins, className: "bg-amber-50 text-amber-700 hover:bg-amber-100", allowed: canCreateFinance },
    { key: "announcement", href: "/communication", label: "Créer une annonce", icon: Megaphone, className: "bg-purple-50 text-purple-700 hover:bg-purple-100", allowed: canManageCommunication },
    { key: "prayer", href: "/prayer/new", label: "Nouveau sujet de prière", icon: HandHeart, className: "bg-pink-50 text-pink-700 hover:bg-pink-100", allowed: canCreatePrayer },
    { key: "report", href: "/reports", label: "Générer un rapport", icon: BarChart3, className: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100", allowed: canViewReports },
  ];

  const visible = actions.filter((a) => a.allowed);
  if (visible.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucun raccourci disponible pour votre rôle.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {visible.map((action) => (
        <Link
          key={action.key}
          href={action.href}
          className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center text-xs font-medium transition-colors ${action.className}`}
        >
          <action.icon className="size-5" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}
