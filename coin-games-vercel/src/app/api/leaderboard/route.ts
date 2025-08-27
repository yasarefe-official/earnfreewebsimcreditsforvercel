import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows: leaderboard } = await sql`
      SELECT
        username,
        coins,
        vip_until
      FROM
        users_v2_1
      WHERE
        coins > 0
      ORDER BY
        coins DESC
      LIMIT 100;
    `;

    return NextResponse.json(leaderboard, { status: 200 });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
