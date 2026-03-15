import { syncMonitoredAccounts } from "../lib/media-x";
import { prisma } from "../lib/db";

async function main() {
  console.log("=== Testing Media-X Flow ===\n");

  // Use specific user ID
  const userId = "cmlr7erxn0000l604we0hc5i2";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`User with ID ${userId} not found`);
    process.exit(1);
  }

  console.log(`Using user: ${user.email} (${user.id})\n`);

  // Test 1: Sync for today (default behavior)
  console.log("Test 1: Syncing monitored X accounts for today...");
  const todayResult = await syncMonitoredAccounts(user.id, "daily", 20);

  if (!todayResult.success) {
    console.error("Failed to sync monitored accounts for today");
    process.exit(1);
  }

  console.log(`\n✓ Sync complete for ${todayResult.reportDate}`);
  console.log(`✓ Accounts synced: ${todayResult.accountCount}`);
  console.log(`✓ Total tweets: ${todayResult.totalTweets}`);
  console.log(`✓ Source count: ${todayResult.sourceCount}`);
  console.log(`✓ Used AI: ${todayResult.usedAi}`);
  console.log();

  // Test 2: Sync for a specific date (e.g., 3 days ago)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - 3);

  console.log(`Test 2: Syncing monitored X accounts for ${targetDate.toISOString().slice(0, 10)}...`);
  const historicalResult = await syncMonitoredAccounts(user.id, "daily", 20, targetDate);

  if (!historicalResult.success) {
    console.error("Failed to sync monitored accounts for historical date");
    process.exit(1);
  }

  console.log(`\n✓ Sync complete for ${historicalResult.reportDate}`);
  console.log(`✓ Accounts synced: ${historicalResult.accountCount}`);
  console.log(`✓ Total tweets: ${historicalResult.totalTweets}`);
  console.log(`✓ Source count: ${historicalResult.sourceCount}`);
  console.log(`✓ Used AI: ${historicalResult.usedAi}`);
  console.log();

  console.log("=== Test Complete ===");
  console.log(`View the reports at: /media-x or /zh/media-x`);
}

main()
  .then(() => {
    console.log("\n✓ All tests passed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Test failed:", error);
    process.exit(1);
  });
