/**
 * Crée les Produits et Prix Stripe (mode Test) pour les plans payants (STARTER, PRO — FREE n'a pas
 * de coût réel, ENTERPRISE reste "sur devis", voir la Phase 3) et stocke les identifiants de Prix
 * obtenus dans `plans.features` (jsonb, déjà utilisé pour la matrice de fonctionnalités depuis
 * `seed-plan-features.ts`) plutôt que d'ajouter des colonnes dédiées à `plans` — voir
 * `features/billing/schemas.PlanFeatures`.
 *
 * Idempotent : si un plan a déjà `stripePriceIdMonthly`/`stripePriceIdYearly` dans `features`, il
 * est ignoré plutôt que de recréer un Produit en double côté Stripe à chaque exécution.
 *
 * Usage : npx tsx db/scripts/setup-stripe-billing.ts (nécessite STRIPE_SECRET_KEY dans .env.local
 * — une clé de test `sk_test_...`, jamais une clé live).
 */
import { config } from "dotenv";
import Stripe from "stripe";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const stripeKey = process.env.STRIPE_SECRET_KEY;
const connectionString = process.env.DATABASE_URL;
if (!stripeKey) throw new Error("STRIPE_SECRET_KEY n'est pas configurée.");
if (!connectionString) throw new Error("DATABASE_URL n'est pas configurée.");
if (!stripeKey.startsWith("sk_test_")) {
  throw new Error("Cette clé ne semble pas être une clé de test Stripe (sk_test_...) — abandon par sécurité.");
}

const stripe = new Stripe(stripeKey);
const sql = postgres(connectionString, { prepare: false, max: 1 });

const PAID_PLANS = ["STARTER", "PRO"] as const;

async function main() {
  for (const code of PAID_PLANS) {
    const rows = await sql<{ id: string; name: string; priceMonthly: string; priceYearly: string; features: Record<string, unknown> }[]>`
      select id, name, price_monthly as "priceMonthly", price_yearly as "priceYearly", features
      from public.plans
      where code = ${code}
    `;
    const plan = rows[0];
    if (!plan) {
      console.log(`  (plan ${code} absent — schema.sql pas encore appliqué ?)`);
      continue;
    }
    if (plan.features?.stripePriceIdMonthly && plan.features?.stripePriceIdYearly) {
      console.log(`✓ ${code} déjà configuré (Price ${plan.features.stripePriceIdMonthly} / ${plan.features.stripePriceIdYearly})`);
      continue;
    }

    const product = await stripe.products.create({ name: `ChurchOS ${plan.name}`, metadata: { planCode: code } });
    const priceMonthly = await stripe.prices.create({
      product: product.id,
      currency: "xof",
      unit_amount: Math.round(Number(plan.priceMonthly)),
      recurring: { interval: "month" },
      metadata: { planCode: code, interval: "monthly" },
    });
    const priceYearly = await stripe.prices.create({
      product: product.id,
      currency: "xof",
      unit_amount: Math.round(Number(plan.priceYearly)),
      recurring: { interval: "year" },
      metadata: { planCode: code, interval: "yearly" },
    });

    await sql`
      update public.plans
      set features = features || ${JSON.stringify({
        stripePriceIdMonthly: priceMonthly.id,
        stripePriceIdYearly: priceYearly.id,
      })}::jsonb
      where id = ${plan.id}
    `;
    console.log(`✓ ${code} créé — Price mensuel ${priceMonthly.id}, Price annuel ${priceYearly.id}`);
  }
}

main()
  .catch((err) => {
    console.error("Échec de la configuration Stripe :", err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
