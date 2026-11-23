import express from "express";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import Score from "./models/Score.js";

const app = express();

const allowed = [
  "https://cat-mouse-maze.aftabaha12.workers.dev",
  ...(process.env.CLIENT_ORIGIN || "*").split(",").map((s) => s.trim()),
];
app.use(
  cors({
    origin: allowed.includes("*") ? true : allowed,
    methods: ["GET", "POST", "OPTIONS"],
  })
);
app.use(express.json({ limit: "10kb" }));

const router = express.Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

router.get("/scores", async (_req, res) => {
  try {
    await connectDB();
    const top = await Score.find({}, "name score level createdAt").sort({ score: -1 }).limit(10).lean();
    res.json(top);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load scores" });
  }
});

router.post("/scores", async (req, res) => {
  const name = String(req.body?.name ?? "").trim().slice(0, 20);
  const score = Math.floor(Number(req.body?.score));
  const level = Math.floor(Number(req.body?.level));
  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!Number.isFinite(score) || score < 0 || score > 1000000)
    return res.status(400).json({ error: "Invalid score" });
  if (!Number.isFinite(level) || level < 1 || level > 100)
    return res.status(400).json({ error: "Invalid level" });
  try {
    await connectDB();
    const doc = await Score.create({ name, score, level });
    res.status(201).json({ id: doc._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save score" });
  }
});

// Works whether Vercel passes "/api/scores" or "/scores"
app.use("/api", router);
app.use("/", router);

export default app;
