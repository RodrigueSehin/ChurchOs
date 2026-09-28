import "server-only";
import type OpenAI from "openai";

import { checkPermission } from "@/lib/auth/guards";
import type { PermissionCode } from "@/lib/rbac/permissions";
import {
  getActiveMembersCount,
  getAverageRecentAttendance,
  getFinanceMonthlyTrend,
  getGivingThisMonth,
  getNewMembersLast30Days,
} from "@/features/analytics/services";
import { getUpcomingEvents } from "@/features/events/services";
import { getPastoralStatusSummary } from "@/features/pastoral/services";

/**
 * Règle absolue de cette phase (voir docs/architecture/04-rbac-permissions.md#churchos-ai) :
 * l'assistant n'accède jamais à des données que l'utilisateur courant n'aurait pas pu voir
 * lui-même. Chaque outil ci-dessous commence par `checkPermission()` — exactement le même garde
 * utilisé par chaque page/Server Action du reste de l'application, jamais une vérification
 * différente ou plus permissive côté IA. Un refus renvoie un objet JSON explicite (jamais une
 * exception qui romprait la conversation) que le modèle doit relayer à l'utilisateur, jamais
 * contourner ou deviner.
 */

type PermissionCheck = Awaited<ReturnType<typeof checkPermission>>;

interface ToolDefinition {
  code: PermissionCode;
  spec: OpenAI.Chat.Completions.ChatCompletionFunctionTool;
  handler: (organizationId: string, check: PermissionCheck) => Promise<unknown>;
}

const TOOLS: ToolDefinition[] = [
  {
    code: "members.view",
    spec: {
      type: "function",
      function: {
        name: "get_member_stats",
        description: "Statistiques sur les membres : nombre de membres actifs et nouveaux membres des 30 derniers jours.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    handler: async (organizationId) => ({
      activeMembers: await getActiveMembersCount(organizationId),
      newMembersLast30Days: await getNewMembersLast30Days(organizationId),
    }),
  },
  {
    code: "attendance.view",
    spec: {
      type: "function",
      function: {
        name: "get_attendance_summary",
        description: "Présence moyenne récente aux cultes/événements de l'église.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    handler: async (organizationId) => ({
      averageRecentAttendance: await getAverageRecentAttendance(organizationId),
    }),
  },
  {
    code: "finance.view",
    spec: {
      type: "function",
      function: {
        name: "get_finance_summary",
        description: "Résumé financier : dons du mois en cours et tendance recettes/dépenses des derniers mois (en XOF).",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    handler: async (organizationId) => ({
      givingThisMonthXOF: await getGivingThisMonth(organizationId),
      monthlyTrend: await getFinanceMonthlyTrend(organizationId),
    }),
  },
  {
    code: "events.view",
    spec: {
      type: "function",
      function: {
        name: "get_upcoming_events",
        description: "Liste des prochains événements publiés de l'église (titre, date, lieu).",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    handler: async (organizationId) => ({ events: await getUpcomingEvents(organizationId) }),
  },
  {
    code: "pastoral.view",
    spec: {
      type: "function",
      function: {
        name: "get_pastoral_summary",
        description: "Nombre de suivis pastoraux par statut (jamais les détails ni les noms des personnes concernées).",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    handler: async (organizationId, check) => ({
      byStatus: await getPastoralStatusSummary(organizationId, {
        userId: check.user.id,
        isAdmin: check.context.isAdmin,
        canViewConfidential: check.context.permissions.has("pastoral.view_confidential"),
      }),
    }),
  },
];

export function getToolSpecs(): OpenAI.Chat.Completions.ChatCompletionFunctionTool[] {
  return TOOLS.map((t) => t.spec);
}

/** Exécute un appel d'outil demandé par le modèle — toujours pour l'organisation et la session
 * de l'utilisateur courant, jamais un contexte différent. */
export async function executeTool(name: string): Promise<Record<string, unknown>> {
  const tool = TOOLS.find((t) => t.spec.function.name === name);
  if (!tool) return { error: "unknown_tool", message: `Outil inconnu : ${name}` };

  const check = await checkPermission(tool.code);
  if (!check.allowed) {
    return {
      error: "permission_denied",
      message: `Vous n'avez pas la permission "${tool.code}" nécessaire pour cette information.`,
    };
  }

  const result = await tool.handler(check.organization.organization.id, check);
  return result as Record<string, unknown>;
}
