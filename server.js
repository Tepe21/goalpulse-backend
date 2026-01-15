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


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
