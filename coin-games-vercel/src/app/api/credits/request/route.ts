import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { username, coinsAmount, creditsAmount } = await request.json();

  // 1. Validate inputs
  if (!username || typeof coinsAmount !== 'number' || typeof creditsAmount !== 'number') {
    return NextResponse.json({ error: 'Missing required fields: username, coinsAmount, creditsAmount' }, { status: 400 });
  }

  if (coinsAmount <= 0 || creditsAmount <= 0) {
    return NextResponse.json({ error: 'Invalid conversion amounts' }, { status: 400 });
  }

  const client = await sql.connect();

  try {
    // 2. Start a database transaction
    await client.query('BEGIN');

    // Fetch the user record and lock the row for update
    const { rows: users } = await client.query(
      `SELECT id, userId, coins FROM users_v2_1 WHERE username = $1 FOR UPDATE;`,
      [username]
    );

    if (users.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    const currentCoins = parseFloat(user.coins) || 0;

    // Check for sufficient funds
    if (currentCoins < coinsAmount) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // 3. Deduct coins from the user
    const newCoins = currentCoins - coinsAmount;
    const now = new Date().toISOString();
    await client.query(
      `UPDATE users_v2_1 SET coins = $1, lastActiveAt = $2 WHERE id = $3;`,
      [newCoins, now, user.id]
    );

    // 4. Create a new record in credit_requests_v2_1
    await client.query(
      `INSERT INTO credit_requests_v2_1 (username, userId, coinsAmount, creditsAmount, status, requestedAt)
       VALUES ($1, $2, $3, $4, 'pending', $5);`,
      [username, user.userid, coinsAmount, creditsAmount, now]
    );

    // 5. Create a new record in coin_transactions_v2_1
    await client.query(
      `INSERT INTO coin_transactions_v2_1 (username, userId, amount, source, type, timestamp)
       VALUES ($1, $2, $3, 'credit_conversion', 'spent', $4);`,
      [username, user.userid, -coinsAmount, now]
    );

    // 6. Commit the transaction
    await client.query('COMMIT');

    return NextResponse.json({ message: 'Credit conversion request submitted successfully.', newBalance: newCoins }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating credit request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
