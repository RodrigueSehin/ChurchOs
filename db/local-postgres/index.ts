import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: ".env.local" });
config();

const DATA_DIR = path.resolve(process.cwd(), ".local-postgres", "data");
const PORT = Number(process.env.LOCAL_PG_PORT ?? 54329);
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "churchos";

export const LOCAL_DATABASE_URL = `postgres://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}`;

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  port: PORT,
  user: USER,
  password: PASSWORD,
  persistent: true,
});

function isInitialised() {
  return existsSync(path.join(DATA_DIR, "PG_VERSION"));
}

export async function startLocalPostgres() {
  const alreadyInitialised = isInitialised();

  if (!alreadyInitialised) {
    console.log(`Initialisation d'un nouveau cluster Postgres dans ${DATA_DIR} ...`);
    await pg.initialise();
  }

  await pg.start();
  console.log(`Postgres démarré sur localhost:${PORT}`);

  if (!alreadyInitialised) {
    const client = pg.getPgClient();
    await client.connect();
    await client.query(`CREATE DATABASE ${DATABASE}`);
    await client.end();
    console.log(`Base "${DATABASE}" créée.`);
  }

  const appClient = pg.getPgClient(DATABASE);
  await appClient.connect();
  await appClient.query(`create extension if not exists "pgcrypto"`);
  await appClient.query(readFileSync(path.join(__dirname, "roles-stub.sql"), "utf-8"));
  await appClient.query(readFileSync(path.join(__dirname, "auth-stub.sql"), "utf-8"));
  await appClient.end();

  return pg;
}

export async function stopLocalPostgres() {
  await pg.stop();
}

// Exécuté directement (`npm run db:local`) : démarre et reste au premier plan.
if (path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url))) {
  startLocalPostgres()
    .then(() => {
      console.log(`\nDATABASE_URL=${LOCAL_DATABASE_URL}`);
      console.log("Postgres local prêt. Ctrl+C pour arrêter.\n");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
