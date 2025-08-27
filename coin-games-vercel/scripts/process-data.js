const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../private/websim_data.json');
const outputPath = path.join(__dirname, '../private/processed_users.json');

console.log('Reading data from:', inputPath);
const rawData = fs.readFileSync(inputPath, 'utf-8');
const data = JSON.parse(rawData);
const users = data.users;

console.log(`Found ${users.length} raw user records.`);

const usersByUsername = {};

for (const user of users) {
  const username = user.username;
  if (!username) {
    console.warn('Skipping record without username:', user);
    continue;
  }

  if (!usersByUsername[username]) {
    usersByUsername[username] = [];
  }
  usersByUsername[username].push(user);
}

const processedUsers = [];
let mergedCount = 0;

for (const username in usersByUsername) {
  const records = usersByUsername[username];

  if (records.length === 1) {
    processedUsers.push(records[0]);
    continue;
  }

  mergedCount++;
  // Sort by latest activity to have the most recent record first
  records.sort((a, b) => {
    const dateA = new Date(a.lastActiveAt || a.updated_at || a.createdAt || a.created_at).getTime();
    const dateB = new Date(b.lastActiveAt || b.updated_at || b.createdAt || b.created_at).getTime();
    return dateB - dateA;
  });

  const primaryRecord = records[0];
  const mergedRecord = { ...primaryRecord };

  // Merge properties from older records if they don't exist in the primary one
  for (let i = 1; i < records.length; i++) {
    const olderRecord = records[i];
    for (const key in olderRecord) {
      if (mergedRecord[key] === null || mergedRecord[key] === undefined) {
        mergedRecord[key] = olderRecord[key];
      }
    }
  }

  // A final pass to ensure essential fields are present and correctly typed
  mergedRecord.coins = parseFloat(mergedRecord.coins || 0);
  mergedRecord.totalCoinsEarned = parseFloat(mergedRecord.totalCoinsEarned || 0);
  mergedRecord.gamesPlayed = parseInt(mergedRecord.gamesPlayed || 0, 10);

  processedUsers.push(mergedRecord);
}

console.log(`Processed ${processedUsers.length} unique users.`);
console.log(`Merged ${mergedCount} sets of duplicate records.`);

const outputData = {
    users: processedUsers
    // In the future, we can add cleaned transactions etc. here
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log('Processed data saved to:', outputPath);
