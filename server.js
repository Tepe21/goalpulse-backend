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


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
