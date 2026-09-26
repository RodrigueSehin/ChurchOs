/**
 * Données de démonstration pour le contenu du dashboard, en attendant les
 * vraies agrégations SQL des modules concernés (Phases 5+). L'organisation et
 * l'utilisateur affichés dans le layout viennent désormais de la vraie session
 * (voir src/lib/auth/session.ts) et de la vraie base — plus de ces données ici.
 */

export const dashboardKpis = [
  { label: "Membres", value: 482, delta: "+12 ce mois-ci" },
  { label: "Nouveaux visiteurs", value: 27, delta: "+5 ce mois-ci" },
  { label: "Présence moyenne", value: "356", delta: "74% de taux de présence" },
  { label: "Dons du mois", value: "3 240 000 FCFA", delta: "+8% vs mois dernier" },
] as const;

export const upcomingEvents = [
  { title: "Culte du dimanche", date: "28 sept. 2026", location: "Sanctuaire principal" },
  { title: "Nuit de prière", date: "3 oct. 2026", location: "Sanctuaire principal" },
  { title: "Formation des nouveaux convertis", date: "10 oct. 2026", location: "Salle B" },
] as const;

export const pastoralFollowUps = [
  { name: "Aïcha Koné", status: "À relancer", assignedTo: "Past. Marie" },
  { name: "Bakary Traoré", status: "En cours", assignedTo: "Past. Jean" },
  { name: "Famille Ouattara", status: "Nouveau", assignedTo: "Non assigné" },
] as const;
