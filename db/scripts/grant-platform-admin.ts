/**
 * Accorde (ou retire avec --revoke) l'accès à la vue d'administration globale `/platform`.
 * Usage : npm run db:grant-platform-admin -- email@exemple.com [--revoke]
 *
 * Idempotent. Le compte doit déjà exister dans `auth.users`. C'est volontairement un script
 * serveur (DATABASE_URL) et non une page : le premier administrateur de la plateforme ne peut
 * pas être créé depuis l'application.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const email = process.argv.slice(2).find((a) => !a.startsWith("--"));
const revoke = process.argv.includes("--revoke");
if (!email) throw new Error("Usage: npm run db:grant-platform-admin -- email@exemple.com [--revoke]");

const sql = postgres(connectionString, { max: 1 });

try {
  const [user] = await sql<{ id: string }[]>`select id from auth.users where lower(email) = lower(${email})`;
  if (!user) throw new Error(`Aucun compte avec l'email ${email}`);

  if (revoke) {
    await sql`delete from public.platform_admins where user_id = ${user.id}`;
    console.log(`Accès plateforme retiré pour ${email}`);
  } else {
    await sql`insert into public.platform_admins (user_id) values (${user.id}) on conflict do nothing`;
    console.log(`Accès plateforme accordé à ${email} → /platform`);
  }
} finally {
  await sql.end();
}
