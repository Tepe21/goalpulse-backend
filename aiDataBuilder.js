import { apiGet } from "./apiFootball.js";
import redis from "./redis.js";

const LEAGUE_ID = 135;
const SEASON = 2023;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buildDataset() {
  try {
    console.log("Building AI dataset...");

    const fixtures = await apiGet("/fixtures", {
      league: LEAGUE_ID,
      season: SEASON
    });

    console.log("Total fixtures:", fixtures.length);

    const dataset = [];

    for (const match of fixtures) {
      if (match.fixture.status.short !== "FT") continue;

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

      const feature = {
        fixtureId: fixtureId,
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

        goalAfter60: (match.goals.home + match.goals.away >= 2) ? 1 : 0
      };

      dataset.push(feature);
      await sleep(350);
    }

    await redis.set("ai_dataset", JSON.stringify(dataset));
    console.log("AI dataset stored. Rows:", dataset.length);

  } catch (err) {
    console.error("AI Data Builder error:", err.message);
  }
}

buildDataset();
