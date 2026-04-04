/**
 * Local test script for Recurring-YouTube cron endpoint
 * Usage: npx tsx scripts/test-recurring-youtube.ts
 */

import { config } from "dotenv";

// Load .env file
config();

async function testRecurringYoutube() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("❌ CRON_SECRET environment variable is required");
    process.exit(1);
  }

  const url = `${baseUrl}/api/cron/recurring-youtube`;
  
  console.log("🚀 Testing Recurring-YouTube endpoint...");
  console.log(`📍 URL: ${url}`);
  console.log(`🔑 Using CRON_SECRET: ${cronSecret.slice(0, 8)}...`);
  console.log("");

  try {
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cronSecret}`,
        "User-Agent": "local-test-script",
      },
      body: "{}",
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log("");
    console.log("📦 Response:");
    console.log(JSON.stringify(data, null, 2));
    console.log("");

    if (response.ok) {
      console.log("✅ Test completed successfully");
      
      if (data.total === 0) {
        console.log("ℹ️  No active schedules found to process");
        console.log("   Check database: SELECT * FROM \"RecurringYoutubeSchedule\" WHERE \"isActive\" = true AND \"nextRunAt\" <= NOW();");
      } else {
        console.log(`✅ Processed: ${data.processed}/${data.total}`);
        if (data.failed > 0) {
          console.log(`❌ Failed: ${data.failed}`);
          console.log("Errors:", data.errors);
        }
      }
    } else {
      console.log("❌ Test failed");
      console.log("Error:", data.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
    process.exit(1);
  }
}

testRecurringYoutube();
