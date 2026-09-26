/**
 * Vérification "smoke test" que le RLS de db/schema.sql isole réellement les
 * organisations : RLS n'est jamais appliqué au superutilisateur/propriétaire de
 * table, donc ce script bascule sur le rôle non-superutilisateur `authenticated`
 * (comme Supabase), positionne `request.jwt.claim.sub` (ce que fait
 * PostgREST/GoTrue en production) et vérifie l'isolation multi-tenant.
 *
 * NOTE : le RLS générique de db/schema.sql (§20) filtre uniquement par
 * `organization_id` — il n'applique PAS de règle de confidentialité fine sur
 * `prayer_requests.is_confidential` ou `pastoral_followups.confidentiality`
 * (ces colonnes existent mais ne sont pas référencées dans une policy). Tout
 * membre actif de l'organisation peut donc lire tout le pastoral/toutes les
 * prières de cette organisation au niveau base — la confidentialité doit être
 * appliquée côté application (Server Actions) tant que ce n'est pas durci en
 * RLS. Ce script ne teste donc que l'isolation inter-organisations, pas une
 * confidentialité intra-organisation qui n'existe pas encore au niveau DB.
 *
 * Usage : npm run db:verify-rls
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

async function main() {
  const orgRows = await admin<{ id: string; organizationId: string }[]>`
    select om.user_id as "id", om.organization_id as "organizationId"
    from organization_memberships om
    where om.status = 'active'
    limit 1
  `;
  const demoUser = orgRows[0];
  if (!demoUser) {
    throw new Error("Aucune organization_memberships trouvée — lancez d'abord `npm run db:seed`.");
  }

  const adminCount = await admin<{ n: number }[]>`
    select count(*)::int as n from people where organization_id = ${demoUser.organizationId}
  `;
  console.log(
    `Organisation de seed : ${demoUser.organizationId} — ${adminCount[0]?.n ?? 0} personnes en base (vue admin, RLS non appliqué).`,
  );

  // `SET LOCAL ROLE` (plutôt qu'une nouvelle connexion) : le superutilisateur perd ses
  // privilèges élevés pour le reste de la transaction, exactement comme PostgREST le
  // fait via `SET ROLE authenticated` après authentification — RLS s'applique alors
  // normalement, sans avoir à gérer un mot de passe séparé pour ce rôle NOLOGIN.
  async function countAsClaimSub(sub: string | null, label: string) {
    return admin.begin(async (tx) => {
      await tx.unsafe(`set local role authenticated`);
      if (sub) {
        await tx.unsafe(`select set_config('request.jwt.claim.sub', $1, true)`, [sub]);
      }
      const peopleRows = await tx<{ n: number }[]>`select count(*)::int as n from people`;
      const membershipRows = await tx<{
        n: number;
      }[]>`select count(*)::int as n from organization_memberships`;
      const n = peopleRows[0]?.n ?? 0;
      const m = membershipRows[0]?.n ?? 0;
      console.log(`  [${label}] people visibles: ${n} | memberships visibles: ${m}`);
      return { n, m };
    });
  }

  console.log("\nTest 1 — utilisateur membre actif de l'organisation de seed :");
  const asMember = await countAsClaimSub(demoUser.id, "user membre de l'org");

  console.log("\nTest 2 — utilisateur random, membre d'AUCUNE organisation :");
  const randomUserId = "99999999-9999-4999-8999-999999999999";
  const asStranger = await countAsClaimSub(randomUserId, "user hors org");

  console.log("\nTest 3 — pas de session (aucun claim JWT positionné) :");
  const asAnonymous = await countAsClaimSub(null, "sans session");

  const ok =
    asMember.n > 0 && asStranger.n === 0 && asStranger.m === 0 && asAnonymous.n === 0 && asAnonymous.m === 0;

  console.log(
    ok
      ? "\n✓ RLS confirmé : isolation multi-tenant (organization_id) OK."
      : "\n✗ RLS INCORRECT — voir les comptages ci-dessus.",
  );
  if (!ok) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("Échec de la vérification RLS :", err);
    process.exitCode = 1;
  })
  .finally(() => admin.end());
