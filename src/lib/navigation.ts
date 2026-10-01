import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  UserPlus,
  CircleUserRound,
  HeartHandshake,
  HandHeart,
  Footprints,
  Gavel,
  Church,
  ShieldCheck,
  HardHat,
  CalendarClock,
  ListChecks,
  CalendarDays,
  ClipboardList,
  QrCode,
  CalendarRange,
  HandCoins,
  Receipt,
  PiggyBank,
  FileBarChart,
  GraduationCap,
  Award,
  Library,
  Megaphone,
  FolderOpen,
  Warehouse,
  PieChart,
  BarChart3,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Phase du plan de sprints qui livre ce module. Utilisé par ComingSoonPage tant que le module n'est pas implémenté. */
  phase: number;
};

export type NavSection = {
  label: string | null;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: null,
    items: [{ title: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, phase: 1 }],
  },
  {
    label: "Membres",
    items: [
      { title: "Membres", href: "/members", icon: Users, phase: 5 },
      { title: "Familles", href: "/families", icon: UsersRound, phase: 5 },
      { title: "Visiteurs", href: "/visitors", icon: UserPlus, phase: 5 },
      { title: "Groupes", href: "/groups", icon: CircleUserRound, phase: 5 },
    ],
  },
  {
    label: "Pastoral",
    items: [
      { title: "Suivi pastoral", href: "/pastoral", icon: HeartHandshake, phase: 6 },
      { title: "Sujets de prière", href: "/prayer", icon: HandHeart, phase: 6 },
      { title: "Visites", href: "/visits", icon: Footprints, phase: 6 },
      { title: "Conseil pastoral", href: "/pastoral-council", icon: Gavel, phase: 6 },
    ],
  },
  {
    label: "Ministères",
    items: [
      { title: "Ministères", href: "/ministries", icon: Church, phase: 7 },
      { title: "Équipes", href: "/teams", icon: ShieldCheck, phase: 7 },
      { title: "Ouvriers", href: "/workers", icon: HardHat, phase: 7 },
      { title: "Services", href: "/services", icon: CalendarClock, phase: 7 },
      { title: "Plannings", href: "/planning", icon: ListChecks, phase: 7 },
    ],
  },
  {
    label: "Événements",
    items: [
      { title: "Événements", href: "/events", icon: CalendarDays, phase: 8 },
      { title: "Inscriptions", href: "/registrations", icon: ClipboardList, phase: 8 },
      { title: "Présences", href: "/attendance", icon: QrCode, phase: 8 },
      { title: "Calendrier", href: "/calendar", icon: CalendarRange, phase: 8 },
    ],
  },
  {
    label: "Finances",
    items: [
      { title: "Dons & offrandes", href: "/finance/income", icon: HandCoins, phase: 9 },
      { title: "Dépenses", href: "/finance/expenses", icon: Receipt, phase: 9 },
      { title: "Budgets", href: "/finance/budgets", icon: PiggyBank, phase: 9 },
      { title: "Rapports financiers", href: "/finance/reports", icon: FileBarChart, phase: 9 },
    ],
  },
  {
    label: "Formations",
    items: [
      { title: "Cours & discipolat", href: "/training", icon: GraduationCap, phase: 10 },
      { title: "Certifications", href: "/training/certifications", icon: Award, phase: 10 },
      { title: "Bibliothèque", href: "/library", icon: Library, phase: 10 },
    ],
  },
  {
    label: "Communication",
    items: [{ title: "Annonces & messages", href: "/communication", icon: Megaphone, phase: 11 }],
  },
  {
    label: "Ressources",
    items: [
      { title: "Documents", href: "/documents", icon: FolderOpen, phase: 12 },
      { title: "Salles & équipements", href: "/resources", icon: Warehouse, phase: 12 },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Rapports", href: "/reports", icon: PieChart, phase: 13 },
      { title: "Statistiques", href: "/analytics", icon: BarChart3, phase: 13 },
    ],
  },
  {
    label: null,
    items: [{ title: "ChurchOS AI", href: "/ai", icon: Sparkles, phase: 15 }],
  },
];

export const settingsNav: NavItem[] = [
  { title: "Profil", href: "/settings/profile", icon: CircleUserRound, phase: 3 },
  { title: "Église", href: "/settings/church", icon: Church, phase: 4 },
  { title: "Utilisateurs", href: "/settings/users", icon: Users, phase: 4 },
  { title: "Rôles", href: "/settings/roles", icon: ShieldCheck, phase: 4 },
  { title: "Facturation", href: "/settings/billing", icon: Receipt, phase: 14 },
  { title: "Notifications", href: "/settings/notifications", icon: Megaphone, phase: 11 },
];

export function findNavItemByHref(href: string): NavItem | undefined {
  for (const section of navSections) {
    const found = section.items.find((item) => item.href === href);
    if (found) return found;
  }
  return settingsNav.find((item) => item.href === href);
}
