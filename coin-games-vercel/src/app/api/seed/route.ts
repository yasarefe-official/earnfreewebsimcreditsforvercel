import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

async function seedUsers() {
  try {
    const filePath = path.join(process.cwd(), 'private', 'processed_users.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    const users = data.users;

    if (!users || users.length === 0) {
      console.log('No users found in processed_users.json. Skipping seeding.');
      return { count: 0 };
    }

    console.log(`Found ${users.length} processed users to seed into the database.`);
    const client = await sql.connect();

    let seededCount = 0;
    for (const user of users) {
      const query = `
        INSERT INTO users_v2_1 (
          id, username, userId, coins, totalCoinsEarned, gamesPlayed,
          hasProjects, projectsCheckedAt, createdAt, lastActiveAt,
          lastPlayedClicker, banned_until, vip_until
        )
        VALUES (
          $1, $2, COALESCE($3, $1), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
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

      const result = await client.query(query, values);
      if (result && result.rowCount && result.rowCount > 0) {
        seededCount++;
        console.log(`Seeded user: ${user.username}`);
      }
    }

    await client.release();
    console.log(`✅ User seeding completed successfully. Seeded ${seededCount} new users.`);
    return { count: seededCount };

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

export async function GET() {
  // In a real production app, this endpoint should be protected or removed after one use.
  try {
    const result = await seedUsers();
    return NextResponse.json({ message: `Database seeded successfully. ${result.count} users were added.` }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/seed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to seed database.', details: errorMessage }, { status: 500 });
  }
}
