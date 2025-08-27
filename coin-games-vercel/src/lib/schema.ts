import { sql } from '@vercel/postgres';

const usersTable = sql`
  CREATE TABLE IF NOT EXISTS users_v2_1 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    userId UUID UNIQUE,
    coins NUMERIC(15, 2) DEFAULT 0,
    totalCoinsEarned NUMERIC(15, 2) DEFAULT 0,
    gamesPlayed INTEGER DEFAULT 0,
    hasProjects BOOLEAN DEFAULT false,
    projectsCheckedAt TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lastActiveAt TIMESTAMP WITH TIME ZONE,
    lastPlayedClicker TIMESTAMP WITH TIME ZONE,
    banned_until TIMESTAMP WITH TIME ZONE,
    vip_until TIMESTAMP WITH TIME ZONE
  );
`;

const coinTransactionsTable = sql`
  CREATE TABLE IF NOT EXISTS coin_transactions_v2_1 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT,
    userId UUID,
    amount NUMERIC(15, 2) NOT NULL,
    source TEXT,
    type TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sessionId TEXT
  );
`;

const creditRequestsTable = sql`
  CREATE TABLE IF NOT EXISTS credit_requests_v2_1 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT,
    userId UUID,
    coinsAmount NUMERIC(15, 2),
    creditsAmount NUMERIC(15, 2),
    status TEXT,
    requestedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approvedAt TIMESTAMP WITH TIME ZONE,
    approvedBy TEXT,
    rejectedAt TIMESTAMP WITH TIME ZONE,
    rejectedBy TEXT
  );
`;

const usedCreditTipsTable = sql`
  CREATE TABLE IF NOT EXISTS used_credit_tips_v2_1 (
    id TEXT PRIMARY KEY,
    user_id UUID,
    credits_spent NUMERIC(15, 2),
    coins_gained NUMERIC(15, 2),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const adminVaultTable = sql`
    CREATE TABLE IF NOT EXISTS admin_vault_v2_1 (
        id TEXT PRIMARY KEY,
        coins NUMERIC(20, 2) DEFAULT 0
    );
`;

const adminVaultTransactionsTable = sql`
    CREATE TABLE IF NOT EXISTS admin_vault_transactions_v2_1 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id UUID,
        recipient_user_id UUID,
        amount NUMERIC(15, 2),
        reason TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`;


export async function createTables() {
  // Note: You should only run this once, ideally in a setup script or migration tool.
  // For simplicity in this project, we can call it from an API route.
  console.log("Creating tables...");
  await sql`${usersTable}`;
  await sql`${coinTransactionsTable}`;
  await sql`${creditRequestsTable}`;
  await sql`${usedCreditTipsTable}`;
  await sql`${adminVaultTable}`;
  await sql`${adminVaultTransactionsTable}`;
  console.log("Tables created successfully.");

  // Seed the admin vault if it does not exist
  const vault = await sql`SELECT * FROM admin_vault_v2_1 WHERE id = 'main'`;
  if (vault.rowCount === 0) {
      console.log("Seeding admin vault...");
      await sql`INSERT INTO admin_vault_v2_1 (id, coins) VALUES ('main', 0)`;
      console.log("Admin vault seeded.");
  }
}
