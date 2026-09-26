/**
 * Applique db/schema.sql DIRECTEMENT (c'est le schéma réellement déployé sur
 * Supabase — voir db/schema.sql en-tête — pas quelque chose que drizzle-kit
 * génère : il contient des fonctions PL/pgSQL, des triggers et des policies RLS
 * qu'aucun outil de migration déclaratif ne peut représenter fidèlement).
 *
 * Sur le Postgres local portable (pas de pgvector — voir README §pgvector), les
 * 3 fragments qui dépendent de l'extension `vector` sont retirés avant
 * application : `create extension "vector"`, la table `ai_documents`
 * (colonne `embedding vector(1536)`) et son index ivfflat, et l'entrée
 * `'ai_documents'` dans la boucle qui active RLS sur les tables org-scopées
 * (sinon `alter table ai_documents enable row level security` échouerait et
 * ferait rollback tout le bloc `do $$ ... $$`, qui couvre ~50 autres tables).
 *
 * Contre un vrai Supabase (pgvector disponible) : appliquer db/schema.sql tel
 * quel (SQL Editor Supabase, ou `psql $DATABASE_URL -f db/schema.sql`).
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

function stripPgvector(sql: string): string {
  let out = sql.replace(/create extension if not exists "vector";\n/, "");

  out = out.replace(
    /create table if not exists public\.ai_documents \([\s\S]*?\n\);\n/,
    "",
  );
  out = out.replace(
    /create index if not exists ai_documents_embedding_idx[\s\S]*?with \(lists = 100\);\n/,
    "",
  );
  out = out.replace("'ai_messages','ai_documents','audit_logs'", "'ai_messages','audit_logs'");

  return out;
}

async function main() {
  const filePath = path.resolve(process.cwd(), "db", "schema.sql");
  const original = readFileSync(filePath, "utf-8");
  const sql = postgres(connectionString!, { prepare: false, max: 1 });

  const hasVector = await sql<{ exists: boolean }[]>`
    select exists (select 1 from pg_extension where extname = 'vector') as exists
  `;

  const content = hasVector[0]?.exists ? original : stripPgvector(original);
  if (!hasVector[0]?.exists) {
    console.log("Extension pgvector absente localement : ai_documents (RAG) ignorée.");
  }

  await sql.unsafe(content);
  console.log("✓ db/schema.sql appliqué.");
  await sql.end();
}

main().catch((err) => {
  console.error("Échec de l'application de db/schema.sql :", err);
  process.exitCode = 1;
});
