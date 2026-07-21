// Local development launcher.
// If no DATABASE_URL is configured (e.g. no Supabase credentials on this
// machine), boots an embedded PostgreSQL instance first, pushes the Prisma
// schema, and then starts the normal server with the local connection string.
// When a real DATABASE_URL exists in .env, this launcher is a no-op wrapper.
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const LOCAL_PORT = 5433;
const LOCAL_URL = `postgresql://postgres:postgres@localhost:${LOCAL_PORT}/aita`;

async function ensureLocalDb() {
  if (process.env.DATABASE_URL) {
    console.log('🔌 Using DATABASE_URL from environment (.env)');
    return;
  }

  const epgModule = require('embedded-postgres');
  const EmbeddedPostgres = epgModule.default || epgModule;
  const databaseDir = path.join(__dirname, '..', '.pgdata');
  const isInitialised = fs.existsSync(path.join(databaseDir, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port: LOCAL_PORT,
    persistent: true,
    // Force UTF-8: the Windows default (WIN1252) cannot store emojis used in
    // learner-category records, which makes every record insert fail.
    initdbFlags: ['--encoding=UTF8', '--no-locale'],
  });

  if (!isInitialised) {
    console.log('🐘 Initialising embedded PostgreSQL (first run)...');
    await pg.initialise();
  }
  console.log('🐘 Starting embedded PostgreSQL on port ' + LOCAL_PORT + '...');
  await pg.start();

  try {
    await pg.createDatabase('aita');
    console.log('🐘 Created database "aita"');
  } catch {
    // already exists
  }

  process.env.DATABASE_URL = LOCAL_URL;
  process.env.DIRECT_URL = LOCAL_URL;

  // Keep the schema in sync AND regenerate the Prisma client (without
  // --skip-generate) so a stale client can never lag behind schema changes
  // like the session `assessment` field — the cause of session-assessment saves
  // failing with "Unknown argument `assessment`".
  execSync('npx prisma db push', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
  });

  // Stop postgres cleanly when the server exits
  const shutdown = async () => {
    try { await pg.stop(); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

ensureLocalDb()
  .then(() => {
    require('./server.cjs');
  })
  .catch(err => {
    console.error('❌ Failed to start local database:', err);
    process.exit(1);
  });
