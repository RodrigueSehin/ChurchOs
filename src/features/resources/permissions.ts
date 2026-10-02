import type { MembershipContext } from "@/lib/rbac/resolve";

export type ResourceAction = "view" | "manage" | "reserve";

/** Permission d'un type de ressource : les salles ont `rooms.*`, tout le reste (équipements, véhicules, autres) `equipment.*`. */
export function resourcePermission(type: string, action: ResourceAction) {
  return `${type === "room" ? "rooms" : "equipment"}.${action}`;
}

type Access = Pick<MembershipContext, "isAdmin" | "permissions">;

export function canOnResource(context: Access, type: string, action: ResourceAction) {
  return context.isAdmin || (context.permissions as ReadonlySet<string>).has(resourcePermission(type, action));
}

/** Droits d'un membre sur les salles et sur les équipements (pour la page et ses composants). */
export function resourceAccess(context: Access) {
  const rooms = { view: canOnResource(context, "room", "view"), manage: canOnResource(context, "room", "manage"), reserve: canOnResource(context, "room", "reserve") };
  const equipment = { view: canOnResource(context, "equipment", "view"), manage: canOnResource(context, "equipment", "manage"), reserve: canOnResource(context, "equipment", "reserve") };
  return { rooms, equipment, canView: rooms.view || equipment.view };
}
