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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
