import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { username, amount, source } = await request.json();

  // 1. Validate inputs
  if (!username || typeof amount !== 'number' || !source) {
    return NextResponse.json({ error: 'Missing required fields: username, amount, source' }, { status: 400 });
  }

  const roundedAmount = parseFloat(Number(amount).toFixed(2));
  if (isNaN(roundedAmount) || !isFinite(roundedAmount) || roundedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const client = await sql.connect();

  try {
    // 6. Begin transaction
    await client.query('BEGIN');

    // 3. Fetch the user record
    const { rows: users } = await client.query(`SELECT id, userId, coins, totalCoinsEarned, gamesPlayed FROM users_v2_1 WHERE username = $1 FOR UPDATE;`, [username]);

    if (users.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    const currentCoins = parseFloat(user.coins) || 0;
    const currentTotalEarned = parseFloat(user.totalcoinearned) || 0;
    const currentGamesPlayed = user.gamesplayed || 0;

    // 4. Update user's coins
    const newCoins = currentCoins + roundedAmount;
    const newTotalEarned = currentTotalEarned + roundedAmount;
    const newGamesPlayed = currentGamesPlayed + 1; // Increment games played
    const now = new Date().toISOString();

    await client.query(
      `UPDATE users_v2_1
       SET coins = $1, totalCoinsEarned = $2, gamesPlayed = $3, lastActiveAt = $4
       WHERE id = $5;`,
      [newCoins, newTotalEarned, newGamesPlayed, now, user.id]
    );

    // 5. Create a new transaction record
    await client.query(
      `INSERT INTO coin_transactions_v2_1 (username, userId, amount, source, type, timestamp)
       VALUES ($1, $2, $3, $4, 'earned', $5);`,
      [username, user.userid, roundedAmount, source, now]
    );

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json({ message: 'Coins awarded successfully', newBalance: newCoins }, { status: 200 });

  } catch (error) {
    // If any error occurs, rollback the transaction
    await client.query('ROLLBACK');
    console.error('Error awarding coins:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
