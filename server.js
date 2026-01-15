import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { apiGet } from "./apiFootball.js";
import redis from "./redis.js";

if (process.env.RUN_WORKERS === "true") {
  import("./liveWorker.js");
  import("./alertsWorker.js");
}

import "./aiDataBuilder.js";
import "./aiTrainer.js";

import * as tf from "@tensorflow/tfjs-node";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GoalPulse backend running");
});

app.get("/ai-dataset-info", async (req, res) => {
  const data = await redis.get("ai_dataset");
  if (!data) return res.json({ status: "Dataset not ready" });
  const dataset = JSON.parse(data);
  res.json({ status: "Dataset ready", rows: dataset.length });
});

app.get("/ai-model-info", async (req, res) => {
  const model = await redis.get("ai_model");
  if (!model) return res.json({ status: "Model not ready" });
  res.json({ status: "Model ready" });
});

app.get("/ai-predict/:fixtureId", async (req, res) => {
  try {
    const fixtureId = req.params.fixtureId;

    const liveData = await redis.get("live_matches");
    if (!liveData) return res.json({ error: "No live data" });

    const matches = JSON.parse(liveData);
    const match = matches.find(m => m.fixture.id == fixtureId);
    if (!match) return res.json({ error: "Match not live" });

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

    const modelData = await redis.get("ai_model");
    if (!modelData) return res.json({ error: "Model not trained" });

    const modelJson = JSON.parse(modelData);
    const model = await tf.models.modelFromJSON(modelJson);

    const tensor = tf.tensor2d([input]);
    const prediction = model.predict(tensor);
    const confidence = (await prediction.data())[0];

    res.json({
      fixtureId: fixtureId,
      suggestion: "Goal in second half",
      confidence: Math.round(confidence * 100)
    });

  } catch (err) {
    res.status(500).json({ error: "Prediction error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
