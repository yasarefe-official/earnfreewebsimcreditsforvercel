import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// This forces the route to be rendered dynamically, preventing caching.
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  const { username } = params;

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    let { rows: users } = await sql`SELECT * FROM users_v2_1 WHERE username = ${username};`;

    if (users.length > 0) {
      return NextResponse.json(users[0], { status: 200 });
    } else {
      // This logic is for creating a user on first-time lookup.
      // It's kept from the original app's behavior.
      const newUserId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newUser = await sql`
        INSERT INTO users_v2_1 (
          username, userId, createdAt, lastActiveAt
        )
        VALUES (
          ${username}, ${newUserId}, ${now}, ${now}
        )
        RETURNING *;
      `;

      return NextResponse.json(newUser.rows[0], { status: 201 });
    }
  } catch (error) {
    console.error(`Error in getOrCreateUserRecord for ${username}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
