import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { requestId } = await request.json();

  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    // In a real app, adminUsername would come from the session.
    const adminUsername = 'ysr';

    const result = await sql`
      UPDATE credit_requests_v2_1
      SET
        status = 'approved',
        approvedAt = ${now},
        approvedBy = ${adminUsername}
      WHERE
        id = ${requestId} AND status = 'pending'
      RETURNING *;
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Request approved successfully', request: result.rows[0] }, { status: 200 });

  } catch (error) {
    console.error('Error approving request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
