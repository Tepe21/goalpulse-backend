// Απλό rule-based engine για live alerts

export function analyzeMatch(match, stats) {
  try {
    const homeTeam = match.teams.home.name;
    const awayTeam = match.teams.away.name;
    const minute = match.fixture.status.elapsed;

    // Βρίσκουμε στατιστικά ομάδων
    const homeStats = stats.find(s => s.team.name === homeTeam);
    const awayStats = stats.find(s => s.team.name === awayTeam);

    if (!homeStats || !awayStats) return null;

    const getStat = (teamStats, type) => {
      const stat = teamStats.statistics.find(s => s.type === type);
      return stat ? parseInt(stat.value) || 0 : 0;
    };

    const homeDanger = getStat(homeStats, "Dangerous Attacks");
    const awayDanger = getStat(awayStats, "Dangerous Attacks");

    const homeShotsOnTarget = getStat(homeStats, "Shots on Target");

    // --- ΚΑΝΟΝΑΣ ---
    if (
      minute > 25 &&
      homeDanger - awayDanger >= 15 &&
      homeShotsOnTarget >= 3
    ) {
      // Confidence απλό score
      const confidence = Math.min(
        95,
        60 + (homeDanger - awayDanger) + homeShotsOnTarget * 2
      );

      return {
        fixtureId: match.fixture.id,
        match: `${homeTeam} vs ${awayTeam}`,
        minute,
        suggestion: "Next Goal Home",
        confidence
      };
    }

    return null;
  } catch (err) {
    console.error("Rule engine error:", err);
    return null;
  }
}
