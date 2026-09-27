/**
 * Vérification "smoke test" dédiée à l'isolation multi-tenant RLS des tables financières
 * (critère de sortie explicite de la Phase 9 : "Permissions finance strictement isolées") —
 * même technique que `db:verify-rls` (`SET LOCAL ROLE authenticated` + `request.jwt.claim.sub`,
 * ce que fait PostgREST/GoTrue en production), mais ciblée sur `financial_transactions` et
 * `budgets` plutôt que sur l'ensemble générique des tables.
 *
 * IMPORTANT — ce que ce script prouve et ce qu'il ne prouve pas : RLS ici ne connaît que
 * `organization_id` (via `is_org_member()`), pas les permissions fines `finance.*` — celles-ci
 * sont vérifiées uniquement côté application (`checkPermission()`), voir
 * docs/architecture/04-rbac-permissions.md. Ce script prouve donc l'isolation *inter-
 * organisation* des données financières (un membre d'une AUTRE organisation, ou un utilisateur
 * sans organisation, ne peut jamais lire les lignes financières d'une organisation qui n'est pas
 * la sienne) — pas une isolation par rôle à l'intérieur d'une même organisation, que RLS ne gère
 * pas et n'a jamais géré dans ce schéma.
 *
 * Réutilise un membership actif déjà existant (comme `db:verify-rls` — évite d'avoir à créer un
 * faux utilisateur `auth.users`, contrainte FK que `organization_memberships.user_id` impose) et
 * y insère un jeu de données financières minimal, qu'il nettoie à la fin qu'il réussisse ou
 * échoue. Ne touche jamais à l'organisation ou au membership eux-mêmes (pas les siens).
 *
 * Usage : npm run db:verify-finance-rls (nécessite au moins un `organization_memberships` actif
 * — lancez `npm run db:seed` d'abord si la base est vide).
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const admin = postgres(connectionString, { prepare: false });

async function canSeeAsClaimSub(sub: string | null, label: string, transactionId: string, budgetId: string) {
  return admin.begin(async (tx) => {
    await tx.unsafe(`set local role authenticated`);
    if (sub) {
      await tx.unsafe(`select set_config('request.jwt.claim.sub', $1, true)`, [sub]);
    }
    const txRows = await tx<{ id: string }[]>`select id from financial_transactions where id = ${transactionId}`;
    const budgetRows = await tx<{ id: string }[]>`select id from budgets where id = ${budgetId}`;
    const seesTx = txRows.length === 1;
    const seesBudget = budgetRows.length === 1;
    console.log(`  [${label}] voit la transaction test: ${seesTx} | voit le budget test: ${seesBudget}`);
    return { seesTx, seesBudget };
  });
}

async function main() {
  const orgRows = await admin<{ id: string; userId: string }[]>`
    select om.organization_id as "id", om.user_id as "userId"
    from organization_memberships om
    where om.status = 'active'
    limit 1
  `;
  const demo = orgRows[0];
  if (!demo) {
    throw new Error("Aucune organization_memberships active trouvée — lancez d'abord `npm run db:seed`.");
  }
  const orgId = demo.id;
  const memberUserId = demo.userId;

  console.log(`Insertion d'un jeu de données financier minimal dans l'organisation ${orgId}...`);
  const fundRows = await admin<{ id: string }[]>`insert into funds (organization_id, name, code) values (${orgId}, 'Fonds test RLS', ${"VERIFY-RLS-" + Date.now()}) returning id`;
  const accountRows = await admin<{ id: string }[]>`insert into financial_accounts (organization_id, name, account_type) values (${orgId}, 'Compte test RLS', 'cash') returning id`;
  const fund = fundRows[0];
  const account = accountRows[0];
  if (!fund || !account) throw new Error("Insertion du fonds ou du compte de test a échoué.");

  const transactionRows = await admin<{ id: string }[]>`
    insert into financial_transactions (organization_id, fund_id, account_id, type, amount, transaction_date)
    values (${orgId}, ${fund.id}, ${account.id}, 'income', 1000, current_date)
    returning id
  `;
  const budgetRows = await admin<{ id: string }[]>`
    insert into budgets (organization_id, name, fiscal_year, starts_on, ends_on, status)
    values (${orgId}, ${"Budget test RLS " + Date.now()}, extract(year from current_date)::int, current_date, current_date, 'draft')
    returning id
  `;
  const transaction = transactionRows[0];
  const budget = budgetRows[0];
  if (!transaction || !budget) throw new Error("Insertion de la transaction ou du budget de test a échoué.");

  try {
    console.log("\nTest 1 — membre actif de l'organisation qui possède ces données :");
    const asMember = await canSeeAsClaimSub(memberUserId, "membre de l'org financière", transaction.id, budget.id);

    console.log("\nTest 2 — utilisateur membre d'AUCUNE organisation :");
    const strangerUserId = "99999999-9999-4999-8999-999999999999";
    const asStranger = await canSeeAsClaimSub(strangerUserId, "user hors org", transaction.id, budget.id);

    console.log("\nTest 3 — pas de session (aucun claim JWT positionné) :");
    const asAnonymous = await canSeeAsClaimSub(null, "sans session", transaction.id, budget.id);

    const ok =
      asMember.seesTx &&
      asMember.seesBudget &&
      !asStranger.seesTx &&
      !asStranger.seesBudget &&
      !asAnonymous.seesTx &&
      !asAnonymous.seesBudget;

    console.log(
      ok
        ? "\n✓ RLS financier confirmé : un membre voit les données de son organisation, personne d'autre ne voit quoi que ce soit."
        : "\n✗ RLS FINANCIER INCORRECT — voir les comptages ci-dessus.",
    );
    if (!ok) process.exitCode = 1;
  } finally {
    console.log("\nNettoyage des données financières de test...");
    await admin`delete from financial_transactions where id = ${transaction.id}`;
    await admin`delete from budgets where id = ${budget.id}`;
    await admin`delete from financial_accounts where id = ${account.id}`;
    await admin`delete from funds where id = ${fund.id}`;
    console.log("Terminé.");
  }
}

main()
  .catch((err) => {
    console.error("Échec de la vérification RLS financière :", err);
    process.exitCode = 1;
  })
  .finally(() => admin.end());
