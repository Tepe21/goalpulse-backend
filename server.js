import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { apiGet } from "./apiFootball.js";
import redis from "./redis.js";

// ===== OPTIONAL WORKERS CONTROL =====
if (process.env.RUN_WORKERS === "true") {
  import("./liveWorker.js");
  import("./alertsWorker.js");
}

// ===== AI DATASET BUILDER =====
import "./aiDataBuilder.js";

// ===== AI TRAINER =====
import "./aiTrainer.js";

// ===== TensorFlow =====
import * as tf from "@tensorflow/tfjs-node";

// ===== APP INIT =====
const app = express();
app.use(cors());
app.use(express.json());

// ===== BASIC TEST =====
app.get("/", (req, res) => {
  res.send("GoalPulse AI Backend Running");
});

// ===== TEST LIVE FETCH DIRECT FROM API =====
app.get("/test-live", async (req, res) => {
  try {
    const live = await apiGet("/fixtures", { live: "all" });
    res.json({
      status: "OK",
      liveMatches: live.length
    });
  } catch (err) {
    res.status(500).json({ error: "API Error" });
  }
});

// ===== TEST REDIS =====
app.get("/test-redis", async (req, res) => {
  try {
    await redis.set("goalpulse_test", "Redis is working!");
    const value = await redis.get("goalpulse_test");
    res.json({ redis: value });
  } catch {
    res.status(500).json({ error: "Redis not working" });
  }
});

// ===== READ LIVE MATCHES FROM REDIS =====
app.get("/live-matches", async (req, res) => {
  try {
    const data = await redis.get("live_matches");
    if (!data) return res.json({ matches: [] });

    const matches = JSON.parse(data);
    res.json({ matchesCount: matches.length, matches });
  } catch {
    res.status(500).json({ error: "Cannot read live matches" });
  }
});

// ===== MANUAL SEARCH =====
app.get("/search-match", async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    if (!query) return res.json({ error: "No query" });

    const data = await redis.get("live_matches");
    if (!data) return res.json({ results: [] });

    const matches = JSON.parse(data);

    const filtered = matches.filter(m => {
      const home = m.teams.home.name.toLowerCase();
      const away = m.teams.away.name.toLowerCase();
      const search = `${home} vs ${away}`;
      return search.includes(query);
    });

    res.json({ results: filtered });
  } catch {
    res.status(500).json({ error: "Search error" });
  }
});

// ===== LIVE STATS BY FIXTURE =====
app.get("/match-stats/:fixtureId", async (req, res) => {
  try {
    const fixtureId = req.params.fixtureId;
    const stats = await apiGet("/fixtures/statistics", {
      fixture: fixtureId
    });
    res.json({ stats });
  } catch {
    res.status(500).json({ error: "Stats error" });
  }
});

// ===== LIVE ALERTS =====
app.get("/live-alerts", async (req, res) => {
  try {
    const data = await redis.get("live_alerts");
    if (!data) return res.json({ alerts: [] });

    const alerts = JSON.parse(data);
    res.json({ alerts });
  } catch {
    res.status(500).json({ error: "Cannot read alerts" });
  }
});

// ===== AI DATASET INFO =====
app.get("/ai-dataset-info", async (req, res) => {
  const data = await redis.get("ai_dataset");
  if (!data) return res.json({ status: "Dataset not ready yet" });

  const dataset = JSON.parse(data);
  res.json({ status: "Dataset ready", rows: dataset.length });
});

// ===== AI MODEL INFO =====
app.get("/ai-model-info", async (req, res) => {
  const model = await redis.get("ai_model");
  if (!model) return res.json({ status: "Model not ready yet" });

  res.json({ status: "Model ready" });
});

// ===== AI PREDICTION ENDPOINT =====
app.get("/ai-predict/:fixtureId", async (req, res) => {
  try {
    const fixtureId = req.params.fixtureId;

    // Get live match from Redis
    const liveData = await redis.get("live_matches");
    if (!liveData) return res.json({ error: "No live data" });

    const matches = JSON.parse(liveData);
    const match = matches.find(m => m.fixture.id == fixtureId);
    if (!match) return res.json({ error: "Match not live" });

    // Get live stats
    const stats = await apiGet("/fixtures/statistics", {
      fixture: fixtureId
    });

    const home = match.teams.home.name;
    const away = match.teams.away.name;

    const homeStats = stats.find(s => s.team.name === home);
    const awayStats = stats.find(s => s.team.name === away);

    const getStat = (teamStats, type) => {
      const stat = teamStats.statistics.find(s => s.type === type);
      return stat ? parseInt(stat.value) || 0 : 0;
    };

    const input = [
      getStat(homeStats, "Dangerous Attacks"),
      getStat(awayStats, "Dangerous Attacks"),
      getStat(homeStats, "Shots on Target"),
      getStat(awayStats, "Shots on Target"),
      getStat(homeStats, "Ball Possession %"),
      getStat(awayStats, "Ball Possession %"),
      getStat(homeStats, "Expected Goals"),
      getStat(awayStats, "Expected Goals")
    ];

    // Load model from Redis
    const modelData = await redis.get("ai_model_
