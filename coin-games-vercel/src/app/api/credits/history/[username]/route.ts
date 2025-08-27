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
    const { rows: history } = await sql`
      SELECT *
      FROM credit_requests_v2_1
      WHERE username = ${username}
      ORDER BY requestedAt DESC;
    `;
    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    console.error(`Error fetching conversion history for ${username}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
