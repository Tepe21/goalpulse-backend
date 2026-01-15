import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const API_URL = "https://v3.football.api-sports.io";

export async function apiGet(endpoint, params = {}) {
  const res = await axios.get(API_URL + endpoint, {
    params,
    headers: {
      "x-rapidapi-key": process.env.API_FOOTBALL_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io"
    }
  });

  return res.data.response;
}
