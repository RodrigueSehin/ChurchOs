/**
 * Seed de démonstration contre le schéma réel (db/schema.sql).
 *
 * db/schema.sql seed déjà lui-même, à l'application, le catalogue `permissions`,
 * les `plans` et les `feature_flags` (§21 SEED RBAC) — ce script n'a donc qu'à
 * créer des données d'exécution : une organisation (via la RPC
 * `create_organization_for_current_user`, qui déclenche `bootstrap_organization()`
 * et crée automatiquement `organization_settings` + les 9 rôles système), le
 * lien `role_permissions` (non seedé par db/schema.sql — voir
 * src/lib/rbac/permissions.ts), puis un jeu minimal de personnes/membres.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";

import * as schema from "../../src/lib/db/schema";
import { PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "../../src/lib/rbac/permissions";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (see .env.local / .env.example)");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

function firstOrThrow<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Seed: aucune ligne retournée pour ${label}`);
  return row;
}

// Identité fixe du compte de démonstration, pour pouvoir relancer le seed de façon idempotente.
const DEMO_USER_ID = "11111111-1111-4111-8111-111111111111";
const DEMO_EMAIL = "jean.kouassi@eglise-la-source.example";
const ORG_SLUG = "eglise-la-source";

async function seedAuthStubUser(): Promise<boolean> {
  // N'existe que contre le Postgres local (db/local-postgres/auth-stub.sql). Contre un vrai
  // projet Supabase, `auth.users` est géré par Supabase Auth — on saute cette étape.
  try {
    await client`
      insert into auth.users (id, email)
      values (${DEMO_USER_ID}, ${DEMO_EMAIL})
      on conflict (id) do nothing
    `;
    return true;
  } catch {
    console.log("  (auth.users indisponible — probablement un vrai Supabase, on passe)");
    return false;
  }
}

async function main() {
  console.log("Seed ChurchOS — Église Évangélique La Source\n");

  console.log("1/5 Utilisateur de démonstration");
  const authAvailable = await seedAuthStubUser();
  if (!authAvailable) {
    throw new Error(
      "Ce seed nécessite auth.users (Postgres local avec le stub, ou créez l'utilisateur via l'API Admin Supabase au préalable).",
    );
  }
  await db
    .insert(schema.profiles)
    .values({ id: DEMO_USER_ID, firstName: "Jean", lastName: "Kouassi", displayName: "Jean Kouassi" })
    .onConflictDoUpdate({ target: schema.profiles.id, set: { updatedAt: new Date() } });

  console.log("2/5 Organisation (via create_organization_for_current_user)");
  let organizationId: string;
  const existingOrg = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, ORG_SLUG));

  if (existingOrg[0]) {
    organizationId = existingOrg[0].id;
    console.log("  déjà présente, réutilisation.");
  } else {
    // La RPC lit auth.uid() : on simule la session du user de démo pour l'appel.
    const result = await client.begin(async (tx) => {
      await tx.unsafe(`select set_config('request.jwt.claim.sub', $1, true)`, [DEMO_USER_ID]);
      return tx<{ id: string }[]>`
        select public.create_organization_for_current_user(
          'Église Évangélique La Source', ${ORG_SLUG}, 'Abidjan', 'CI'
        ) as id
      `;
    });
    organizationId = firstOrThrow(result, "create_organization_for_current_user").id;
  }

  const campus = firstOrThrow(
    await db
      .insert(schema.campuses)
      .values({
        organizationId,
        name: "Campus Principal",
        addressLine1: "Boulevard de la République",
        city: "Abidjan",
        isMain: true,
      })
      .onConflictDoUpdate({
        target: [schema.campuses.organizationId, schema.campuses.name],
        set: { updatedAt: new Date() },
      })
      .returning(),
    "campuses",
  );

  console.log("3/5 Permissions (role_permissions — non seedé par db/schema.sql)");
  const allPermissions = await db.select().from(schema.permissions);
  const permissionIdByCode = new Map(allPermissions.map((p) => [p.code, p.id]));
  const orgRoles = await db
    .select()
    .from(schema.roles)
    .where(eq(schema.roles.organizationId, organizationId));
  const roleIdByCode = new Map(orgRoles.map((r) => [r.code, r.id]));

  for (const code of SYSTEM_ROLES) {
    const roleId = roleIdByCode.get(code);
    if (!roleId) continue; // rôle système pas encore seedé pour cette org (ne devrait pas arriver)
    const permissionIds = ROLE_PERMISSIONS[code]
      .map((permCode) => permissionIdByCode.get(permCode))
      .filter((id): id is string => Boolean(id));
    if (permissionIds.length) {
      await db
        .insert(schema.rolePermissions)
        .values(permissionIds.map((permissionId) => ({ roleId, permissionId })))
        .onConflictDoNothing();
    }
  }

  console.log("4/5 Quelques personnes / membres de démonstration");
  const peopleNames: Array<[string, string]> = [
    ["Marie", "Koné"],
    ["Aïcha", "Koné"],
    ["Bakary", "Traoré"],
    ["Fatou", "Ouattara"],
    ["Yao", "N'Guessan"],
  ];
  const insertedPeople = await db
    .insert(schema.people)
    .values(
      peopleNames.map(([firstName, lastName]) => ({
        organizationId,
        campusId: campus.id,
        firstName,
        lastName,
      })),
    )
    .returning();

  await db.insert(schema.members).values(
    insertedPeople.map((p) => ({ organizationId, personId: p.id, status: "active" as const })),
  );

  console.log("5/5 Vérification du nombre de permissions catalogue");
  console.log(`  Permissions au catalogue : ${allPermissions.length} (attendu ${PERMISSIONS.length})`);

  console.log("\nSeed terminé.");
  console.log(`  Organisation : Église Évangélique La Source (${organizationId})`);
  console.log(`  Campus       : ${campus.name}`);
  console.log(`  Personnes    : ${insertedPeople.length}`);
}

main()
  .catch((err) => {
    console.error("Échec du seed :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
