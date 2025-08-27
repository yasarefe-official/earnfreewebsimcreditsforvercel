import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { requestId } = await request.json();

  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  const client = await sql.connect();

  try {
    await client.query('BEGIN');

    // Get the request details and lock the row
    const { rows: requests } = await client.query(
      `SELECT * FROM credit_requests_v2_1 WHERE id = $1 AND status = 'pending' FOR UPDATE;`,
      [requestId]
    );

    if (requests.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
    }

    const requestData = requests[0];
    const { username, userid, coinsamount: coinsAmount } = requestData;
    const now = new Date().toISOString();
    const adminUsername = 'ysr'; // Placeholder for auth

    // 1. Update request status to 'rejected'
    await client.query(
      `UPDATE credit_requests_v2_1
       SET status = 'rejected', rejectedAt = $1, rejectedBy = $2
       WHERE id = $3;`,
      [now, adminUsername, requestId]
    );

    // 2. Refund coins to the user
    await client.query(
      `UPDATE users_v2_1
       SET coins = coins + $1
       WHERE username = $2;`,
      [coinsAmount, username]
    );

    // 3. Create a refund transaction log
    await client.query(
      `INSERT INTO coin_transactions_v2_1 (username, userId, amount, source, type, timestamp)
       VALUES ($1, $2, $3, 'request_rejection', 'refund', $4);`,
      [username, userid, coinsAmount, now]
    );

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Request rejected and coins refunded' }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
