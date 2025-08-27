import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // This endpoint is for one-time setup and should be protected or removed in a real production app.
  console.log('Attempting to seed database...');

  try {
    // --- 1. Read and Process the JSON data ---
    const filePath = path.join(process.cwd(), 'private', 'processed_users.json');
    if (!fs.existsSync(filePath)) {
      console.error('processed_users.json not found. Please run the processing script first.');
      return NextResponse.json({ error: 'Processed data file not found.' }, { status: 500 });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    const users = data.users;

    if (!users || users.length === 0) {
      console.log('No users found to seed.');
      return NextResponse.json({ message: "No users found in processed_users.json. Nothing to seed." }, { status: 200 });
    }

    console.log(`Found ${users.length} processed users to seed.`);

    // --- 2. Connect to the database ---
    const client = await sql.connect();

    // --- 3. Loop and Insert each user ---
    let seededCount = 0;
    for (const user of users) {
      const query = `
        INSERT INTO users_v2_1 (
          id, username, userId, coins, totalCoinsEarned, gamesPlayed,
          hasProjects, projectsCheckedAt, createdAt, lastActiveAt,
          lastPlayedClicker, banned_until, vip_until
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (username) DO NOTHING;
      `;

      const values = [
        user.id || null,
        user.username,
        user.userId || user.user_id || null,
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

      const result = await client.query(query, values);

      // Explicit, verbose null check to be absolutely sure.
      if (result !== null && typeof result.rowCount === 'number' && result.rowCount > 0) {
        seededCount++;
      }
    }

    await client.release();
    console.log(`✅ User seeding completed successfully. Seeded ${seededCount} new users.`);
    return NextResponse.json({ message: `Database seeded successfully. ${seededCount} users were added.` }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/seed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to seed database.', details: errorMessage }, { status: 500 });
  }
}
