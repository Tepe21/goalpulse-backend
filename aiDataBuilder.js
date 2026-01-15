import { apiGet } from "./apiFootball.js";
import redis from "./redis.js";

// Θα χτίσουμε dataset για ένα πρωτάθλημα (π.χ. Serie A)
const LEAGUE_ID = 135;   // Serie A
const SEASON = 2023;     // Σεζόν

async function buildDataset() {
  try {
    console.log("📦 Building AI dataset...");

    // 1) Παίρνουμε όλα τα fixtures της σεζόν
    const fixtures = await apiGet("/fixtures", {
      league: LEAGUE_ID,
      season: SEASON
    });

    console.log("Total fixtures:", fixtures.length);

    const dataset = [];

    // 2) Για κάθε αγώνα παίρνουμε στατιστικά
    for (const match of fixtures) {
      if (match.fixture.status.short !== "FT") continue; // μόνο τελειωμένοι

      const fixtureId = match.fixture.id;

      const stats = await apiGet("/fixtures/statistics", {
        fixture: fixtureId
      });

      if (!stats || stats.length === 0) continue;

      const home = match.teams.home.name;
      const away = match.teams.away.name;

      const homeStats = stats.find(s => s.team.name === home);
      const awayStats = stats.find(s => s.team.name === away);

      if (!homeStats || !awayStats) continue;

      const getStat = (teamStats, type) => {
        const stat = teamStats.statistics.find(s => s.type === type);
        return stat ? parseInt(stat.value) || 0 : 0;
      };

      // --- Features ---
      const feature = {
        fixtureId,
        league: LEAGUE_ID,
        season: SEASON,

        homeDanger: getStat(homeStats, "Dangerous Attacks"),
        awayDanger: getStat(awayStats, "Dangerous Attacks"),

        homeShotsOnTarget: getStat(homeStats, "Shots on Target"),
        awayShotsOnTarget: getStat(awayStats, "Shots on Target"),

        homePossession: getStat(homeStats, "Ball Possession %"),
        awayPossession: getStat(awayStats, "Ball Possession %"),

        homeXG: getStat(homeStats, "Expected Goals"),
        awayXG: getStat(awayStats, "Expected Goals"),

        // --- Label ---
        // 1 αν μπήκε γκολ μετά το 60', 0 αν όχι
        goalAfter60:
          match.goals.home + match.goals.away > 1 ? 1 : 0
      };

      dataset.push(feature);
    }

    // 3) Αποθήκευση dataset στο Redis
    await redis.set("ai_dataset", JSON.stringify(dataset));

    console.log("✅ Dataset stored. Rows:", dataset.length);
  } catch (err) {
    console.error("AI Data Builder error:", err.message);
  }
}

// Τρέχει μία φορά όταν ξεκινήσει
buildDataset();
