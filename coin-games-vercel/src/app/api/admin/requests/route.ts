import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// This forces the route to be rendered dynamically, preventing caching.
export const dynamic = 'force-dynamic';

// In a real app, you'd protect this route to ensure only admins can access it.
export async function GET() {
  try {
    const { rows: requests } = await sql`
      SELECT *
      FROM credit_requests_v2_1
      ORDER BY
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'rejected' THEN 3
          ELSE 4
        END,
        requestedAt DESC;
    `;
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    console.error('Error fetching credit requests for admin:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
