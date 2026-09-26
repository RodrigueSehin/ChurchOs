/**
 * Peuple `public.plans.features` (jsonb, seedé vide par db/schema.sql §21) avec la matrice de
 * fonctionnalités par plan affichée à l'étape "Abonnement" de l'onboarding — pour que le
 * tableau comparatif lise de vraies données Postgres plutôt qu'une matrice codée en dur côté
 * front (voir docs/architecture/07-sprint-plan.md, règle "aucune donnée hardcodée").
 *
 * Idempotent : peut être relancé sans effet de bord, y compris contre le vrai Supabase.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

type Support = "community" | "email" | "email_chat" | "dedicated";

interface PlanFeatures {
  members: boolean;
  pastoral: boolean;
  ministries: boolean;
  events: boolean;
  finance: boolean;
  training: boolean;
  communication: boolean;
  documents: boolean;
  analytics: boolean;
  multi_campus: boolean;
  support: Support;
}

const FEATURES: Record<string, PlanFeatures> = {
  FREE: {
    members: true,
    pastoral: false,
    ministries: false,
    events: true,
    finance: false,
    training: false,
    communication: false,
    documents: false,
    analytics: false,
    multi_campus: false,
    support: "community",
  },
  STARTER: {
    members: true,
    pastoral: true,
    ministries: true,
    events: true,
    finance: true,
    training: false,
    communication: true,
    documents: true,
    analytics: false,
    multi_campus: false,
    support: "email",
  },
  PRO: {
    members: true,
    pastoral: true,
    ministries: true,
    events: true,
    finance: true,
    training: true,
    communication: true,
    documents: true,
    analytics: true,
    multi_campus: false,
    support: "email_chat",
  },
  ENTERPRISE: {
    members: true,
    pastoral: true,
    ministries: true,
    events: true,
    finance: true,
    training: true,
    communication: true,
    documents: true,
    analytics: true,
    multi_campus: true,
    support: "dedicated",
  },
};

async function main() {
  const sql = postgres(connectionString!, { prepare: false, max: 1 });

  for (const [code, features] of Object.entries(FEATURES)) {
    const result = await sql`
      update public.plans
      set features = ${JSON.stringify(features)}::jsonb
      where code = ${code}
      returning code
    `;
    console.log(result[0] ? `✓ ${code}` : `  (plan ${code} absent — schema.sql pas encore appliqué ?)`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error("Échec du peuplement de plans.features :", err);
  process.exitCode = 1;
});
