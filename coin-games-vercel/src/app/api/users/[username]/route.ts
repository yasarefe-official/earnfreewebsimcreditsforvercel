import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  const { username } = params;

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    // First, try to find the user
    let { rows: users } = await sql`SELECT * FROM users_v2_1 WHERE username = ${username};`;

    if (users.length > 0) {
      // User found, return the record
      return NextResponse.json(users[0], { status: 200 });
    } else {
      // User not found, create a new record
      // For now, we'll use a placeholder for userId, as auth is not implemented yet.
      // In the future, this should come from the authenticated session.
      const newUserId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newUser = await sql`
        INSERT INTO users_v2_1 (
          username, userId, coins, totalCoinsEarned, gamesPlayed,
          hasProjects, createdAt, lastActiveAt
        )
        VALUES (
          ${username}, ${newUserId}, 0, 0, 0, false, ${now}, ${now}
        )
        RETURNING *;
      `;

      return NextResponse.json(newUser.rows[0], { status: 201 }); // 201 Created
    }
  } catch (error) {
    console.error('Error in getOrCreateUserRecord:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
