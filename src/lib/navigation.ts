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
  Share2,
  Megaphone,
  MessageSquareText,
  Images,
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
  /**
   * Permission requise pour voir l'entrée dans le menu (la même que celle que vérifie la page ; une liste = l'une d'elles suffit). Absente = visible
   * par tout membre connecté. La page reste protégée côté serveur : le menu filtré n'est qu'un confort.
   */
  permission?: string | string[];
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
      { title: "Membres", href: "/members", icon: Users, phase: 5, permission: "members.view" },
      { title: "Familles", href: "/families", icon: UsersRound, phase: 5, permission: "members.view" },
      { title: "Visiteurs", href: "/visitors", icon: UserPlus, phase: 5, permission: "members.view" },
      { title: "Groupes", href: "/groups", icon: CircleUserRound, phase: 5, permission: "members.view" },
    ],
  },
  {
    label: "Pastoral",
    items: [
      { title: "Suivi pastoral", href: "/pastoral", icon: HeartHandshake, phase: 6, permission: "pastoral.view" },
      { title: "Sujets de prière", href: "/prayer", icon: HandHeart, phase: 6, permission: "prayer.view" },
      { title: "Visites", href: "/visits", icon: Footprints, phase: 6, permission: "visits.view" },
      { title: "Conseil pastoral", href: "/pastoral-council", icon: Gavel, phase: 6, permission: "pastoral_council.view" },
    ],
  },
  {
    label: "Ministères",
    items: [
      { title: "Ministères", href: "/ministries", icon: Church, phase: 7, permission: "ministries.view" },
      { title: "Équipes", href: "/teams", icon: ShieldCheck, phase: 7, permission: "teams.view" },
      { title: "Ouvriers", href: "/workers", icon: HardHat, phase: 7, permission: "workers.view" },
      { title: "Services", href: "/services", icon: CalendarClock, phase: 7, permission: "services.view" },
      { title: "Plannings", href: "/planning", icon: ListChecks, phase: 7, permission: "planning.view" },
    ],
  },
  {
    label: "Événements",
    items: [
      { title: "Événements", href: "/events", icon: CalendarDays, phase: 8, permission: "events.view" },
      { title: "Inscriptions", href: "/registrations", icon: ClipboardList, phase: 8, permission: "registrations.view" },
      { title: "Présences", href: "/attendance", icon: QrCode, phase: 8, permission: "attendance.view" },
      { title: "Calendrier", href: "/calendar", icon: CalendarRange, phase: 8, permission: "calendar.view" },
    ],
  },
  {
    label: "Finances",
    items: [
      { title: "Dons & offrandes", href: "/finance/income", icon: HandCoins, phase: 9, permission: "finance.view" },
      { title: "Dépenses", href: "/finance/expenses", icon: Receipt, phase: 9, permission: "finance.view" },
      { title: "Budgets", href: "/finance/budgets", icon: PiggyBank, phase: 9, permission: "finance.view" },
      { title: "Rapports financiers", href: "/finance/reports", icon: FileBarChart, phase: 9, permission: "finance.view" },
    ],
  },
  {
    label: "Formations",
    items: [
      { title: "Cours & discipolat", href: "/training", icon: GraduationCap, phase: 10, permission: "training.view" },
      { title: "Certifications", href: "/training/certifications", icon: Award, phase: 10, permission: "certifications.view" },
      { title: "Bibliothèque", href: "/library", icon: Library, phase: 10, permission: "library.view" },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Annonces", href: "/communication", icon: Megaphone, phase: 11, permission: "communication.view" },
      { title: "Messages (SMS/Email)", href: "/communication/messages", icon: MessageSquareText, phase: 11, permission: "messages.view" },
      { title: "Médias", href: "/communication/media", icon: Images, phase: 11, permission: "media.view" },
    ],
  },
  {
    label: "Ressources",
    items: [
      { title: "Documents", href: "/documents", icon: FolderOpen, phase: 12, permission: "documents.view" },
      { title: "Salles & équipements", href: "/resources", icon: Warehouse, phase: 12, permission: ["rooms.view", "equipment.view"] },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Rapports", href: "/reports", icon: PieChart, phase: 13, permission: "reports.export" },
      { title: "Statistiques", href: "/analytics", icon: BarChart3, phase: 13, permission: "reports.view" },
    ],
  },
  {
    label: null,
    items: [{ title: "ChurchOS AI", href: "/ai", icon: Sparkles, phase: 15 }],
  },
];

export const settingsNav: NavItem[] = [
  { title: "Profil", href: "/settings/profile", icon: CircleUserRound, phase: 3 },
  { title: "Église", href: "/settings/church", icon: Church, phase: 4, permission: "settings.manage" },
  { title: "Utilisateurs", href: "/settings/users", icon: Users, phase: 4, permission: "settings.manage" },
  { title: "Rôles", href: "/settings/roles", icon: ShieldCheck, phase: 4, permission: "settings.manage" },
  { title: "Facturation", href: "/settings/billing", icon: Receipt, phase: 14, permission: "settings.manage" },
  { title: "Notifications", href: "/settings/notifications", icon: Megaphone, phase: 11 },
  { title: "Réseaux sociaux", href: "/settings/social", icon: Share2, phase: 11, permission: "settings.manage" },
];

export function findNavItemByHref(href: string): NavItem | undefined {
  for (const section of navSections) {
    const found = section.items.find((item) => item.href === href);
    if (found) return found;
  }
  return settingsNav.find((item) => item.href === href);
}

/** Libellé du groupe du menu qui contient cette page (`null` si hors menu ou sans groupe). */
export function findNavGroupLabel(href: string): string | null {
  return navSections.find((section) => section.items.some((item) => item.href === href))?.label ?? null;
}

/**
 * Adresses du menu que l'utilisateur a le droit de voir : toutes pour un administrateur, sinon celles dont la
 * permission est détenue (les entrées sans permission sont visibles par tous). Calculé côté serveur : les icônes du
 * menu sont des composants et ne peuvent pas être passées aux composants clients.
 */
export function getAllowedNavHrefs(isAdmin: boolean, permissions: ReadonlySet<string>): string[] {
  const items = [...navSections.flatMap((section) => section.items), ...settingsNav];
  return items.filter((item) => {
    if (isAdmin || !item.permission) return true;
    return [item.permission].flat().some((code) => permissions.has(code));
  }).map((item) => item.href);
}
