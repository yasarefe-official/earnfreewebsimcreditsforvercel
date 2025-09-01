'use server';

import { sql } from '@vercel/postgres';

export async function getOrCreateUser(username: string) {
  try {
    // Check if user exists
    let userResult = await sql`
      SELECT id, username, coins FROM users_v2_1 WHERE username = ${username};
    `;

    if (userResult.rowCount && userResult.rowCount > 0) {
      // User exists, return user data
      return { user: userResult.rows[0] };
    } else {
      // User does not exist, create a new user
      const newUserResult = await sql`
        INSERT INTO users_v2_1 (id, username, coins, totalCoinsEarned, gamesPlayed, createdAt, lastActiveAt)
        VALUES (DEFAULT, ${username}, 0, 0, 0, NOW(), NOW())
        RETURNING id, username, coins;
      `;
      return { user: newUserResult.rows[0] };
    }
  } catch (error) {
    console.error('Error getting or creating user:', error);
    return { error: 'Failed to process user data.' };
  }
}

export async function awardCoins(username: string, amount: number, source: string) {
  try {
    const result = await sql`
      UPDATE users_v2_1
      SET coins = coins + ${amount}, totalCoinsEarned = totalCoinsEarned + ${amount}
      WHERE username = ${username}
      RETURNING coins;
    `;
    return { newBalance: result.rows[0].coins };
  } catch (error) {
    console.error('Error awarding coins:', error);
    return { error: 'Failed to award coins.' };
  }
}

export async function getLeaderboard() {
  try {
    const result = await sql`
      SELECT username, coins, vip_until
      FROM users_v2_1
      ORDER BY coins DESC
      LIMIT 10;
    `;
    return { users: result.rows };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return { error: 'Failed to get leaderboard.' };
  }
}

export async function getConversionHistory(username: string) {
  try {
    const result = await sql`
      SELECT coinsAmount, creditsAmount, status, requestedAt
      FROM credit_requests_v2_1
      WHERE username = ${username}
      ORDER BY requestedAt DESC;
    `;
    return { history: result.rows };
  } catch (error) {
    console.error('Error getting conversion history:', error);
    return { error: 'Failed to get conversion history.' };
  }
}

export async function requestConversion(username: string, coinsAmount: number) {
    const creditsAmount = Math.floor(coinsAmount / 4);
    try {
        const userResult = await sql`SELECT coins FROM users_v2_1 WHERE username = ${username}`;
        if (userResult.rows[0].coins < coinsAmount) {
            return { error: 'Insufficient coins.' };
        }

        await sql`
            UPDATE users_v2_1
            SET coins = coins - ${coinsAmount}
            WHERE username = ${username};
        `;

        await sql`
            INSERT INTO credit_requests_v2_1 (username, coinsAmount, creditsAmount, status)
            VALUES (${username}, ${coinsAmount}, ${creditsAmount}, 'pending');
        `;

        const updatedUser = await sql`SELECT coins FROM users_v2_1 WHERE username = ${username}`;

        return { newBalance: updatedUser.rows[0].coins };
    } catch (error) {
        console.error('Error requesting conversion:', error);
        return { error: 'Failed to request conversion.' };
    }
}

export async function getAdminRequests() {
    try {
        const result = await sql`
            SELECT id, username, coinsAmount, creditsAmount, status, requestedAt
            FROM credit_requests_v2_1
            WHERE status = 'pending'
            ORDER BY requestedAt ASC;
        `;
        return { requests: result.rows };
    } catch (error) {
        console.error('Error getting admin requests:', error);
        return { error: 'Failed to get admin requests.' };
    }
}

export async function approveRequest(requestId: string) {
    try {
        await sql`
            UPDATE credit_requests_v2_1
            SET status = 'approved', approvedAt = NOW()
            WHERE id = ${requestId};
        `;
        return { success: true };
    } catch (error) {
        console.error('Error approving request:', error);
        return { error: 'Failed to approve request.' };
    }
}

export async function rejectRequest(requestId: string) {
    try {
        const request = await sql`SELECT username, coinsAmount FROM credit_requests_v2_1 WHERE id = ${requestId}`;
        if (!request.rowCount || request.rowCount === 0) {
            return { error: 'Request not found.' };
        }
        const { username, coinsamount } = request.rows[0];

        await sql`
            UPDATE users_v2_1
            SET coins = coins + ${coinsamount}
            WHERE username = ${username};
        `;

        await sql`
            UPDATE credit_requests_v2_1
            SET status = 'rejected', rejectedAt = NOW()
            WHERE id = ${requestId};
        `;
        return { success: true };
    } catch (error) {
        console.error('Error rejecting request:', error);
        return { error: 'Failed to reject request.' };
    }
}
