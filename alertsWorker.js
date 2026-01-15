import redis from "./redis.js";
import { apiGet } from "./apiFootball.js";
import { analyzeMatch } from "./ruleEngine.js";

const ALERT_REFRESH = 30; // seconds

async function scanLiveMatches() {
  try {
    console.log("🔎 Scanning live matches for alerts...");

    const data = await redis.get("live_matches");
    if (!data) return;

    const matches = JSON.parse(data);
    const alerts = [];

    for (const match of matches) {
      const fixtureId = match.fixture.id;

      // Παίρνουμε live stats για τον αγώνα
      const stats = await apiGet("/fixtures/statistics", {
        fixture: fixtureId
      });

      const result = analyzeMatch(match, stats);

      if (result) {
        alerts.push(result);
      }
    }

    await redis.set("live_alerts", JSON.stringify(alerts), "EX", ALERT_REFRESH);

    console.log("🚨 Alerts stored:", alerts.length);
  } catch (err) {
    console.error("Alerts worker error:", err.message);
  }
}

// Run immediately
scanLiveMatches();

// Repeat
setInterval(scanLiveMatches, ALERT_REFRESH * 1000);
