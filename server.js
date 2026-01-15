import "./liveWorker.js";
import "./alertsWorker.js";
import redis from "./redis.js";
import express from "express";
import cors from "cors";
import { apiGet } from "./apiFootball.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GoalPulse AI Backend Running");
});

app.get("/test-live", async (req, res) => {
  try {
    const live = await apiGet("/fixtures", { live: "all" });
    res.json({
      status: "OK",
      liveMatches: live.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "API Error" });
  }
});
app.get("/test-redis", async (req, res) => {
  try {
    await redis.set("goalpulse_test", "Redis is working!");
    const value = await redis.get("goalpulse_test");
    res.json({ redis: value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Redis not working" });
  }
});
app.get("/live-matches", async (req, res) => {
  try {
    const data = await redis.get("live_matches");
    if (!data) return res.json({ matches: [] });

    const matches = JSON.parse(data);
    res.json({ matchesCount: matches.length, matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot read live matches" });
  }
});
app.get("/search-match", async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    if (!query) return res.json({ error: "No query" });

    const data = await redis.get("live_matches");
    if (!data) return res.json({ matches: [] });

    const matches = JSON.parse(data);

    const filtered = matches.filter(m => {
      const home = m.teams.home.name.toLowerCase();
      const away = m.teams.away.name.toLowerCase();
      const search = `${home} vs ${away}`;
      return search.includes(query);
    });

    res.json({ results: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search error" });
  }
});
app.get("/match-stats/:fixtureId", async (req, res) => {
  try {
    const fixtureId = req.params.fixtureId;

    const stats = await apiGet("/fixtures/statistics", {
      fixture: fixtureId
    });

    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stats error" });
  }
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
