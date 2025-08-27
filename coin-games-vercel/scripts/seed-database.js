// This script seeds the database with the processed user data from the JSON file.
// It's designed to be run once after the database is set up.

// Load environment variables from .env.local for the database connection string
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function seedUsers() {
  try {
    const filePath = path.join(__dirname, '../private/processed_users.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    const users = data.users;

    if (!users || users.length === 0) {
      console.log('No users found in processed_users.json. Skipping seeding.');
      return;
    }

    console.log(`Found ${users.length} processed users to seed into the database.`);

    const client = await sql.connect();

    for (const user of users) {
      // Use COALESCE to handle potential null/undefined values and different key names
      const query = `
        INSERT INTO users_v2_1 (
          id, username, userId, coins, totalCoinsEarned, gamesPlayed,
          hasProjects, projectsCheckedAt, createdAt, lastActiveAt,
          lastPlayedClicker, banned_until, vip_until
        )
        VALUES (
          COALESCE($1, gen_random_uuid()), $2, COALESCE($3, $1), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        ON CONFLICT (username) DO NOTHING;
      `;

      const values = [
        user.id,
        user.username,
        user.userId || user.user_id,
        user.coins || 0,
        user.totalCoinsEarned || 0,
        user.gamesPlayed || 0,
        user.hasProjects || false,
        user.projectsCheckedAt || null,
        user.createdAt || user.created_at,
        user.lastActiveAt || null,
        user.lastPlayedClicker || null,
        user.banned_until || null,
        user.vip_until || null,
      ];

      await client.query(query, values);
      console.log(`Seeded user: ${user.username}`);
    }

    await client.release();
    console.log('✅ User seeding completed successfully.');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

// In the future, we could add functions to seed transactions, etc.
// async function seedTransactions() { ... }

async function main() {
  console.log('Starting database seeding...');
  await seedUsers();
  // await seedTransactions();
  console.log('Database seeding finished.');
}

main().catch((err) => {
  console.error('An error occurred during the database seeding process:', err);
});
