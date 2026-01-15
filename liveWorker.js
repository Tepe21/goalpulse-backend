import { apiGet } from "./apiFootball.js";
import redis from "./redis.js";

const LIVE_REFRESH_INTERVAL = 20; // δευτερόλεπτα

async function fetchAndStoreLiveMatches() {
  try {
    console.log("⏳ Fetching live matches...");

    const liveMatches = await apiGet("/fixtures", { live: "all" });

    // Αποθήκευση στο Redis
    await redis.set(
      "live_matches",
      JSON.stringify(liveMatches),
      "EX",
      LIVE_REFRESH_INTERVAL
    );

    console.log("✅ Live matches stored:", liveMatches.length);
  } catch (error) {
    console.error("❌ Error fetching live matches:", error.message);
  }
}

// Τρέχει αμέσως
fetchAndStoreLiveMatches();

// Και μετά κάθε Χ δευτερόλεπτα
setInterval(fetchAndStoreLiveMatches, LIVE_REFRESH_INTERVAL * 1000);
