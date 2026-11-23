const BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

export async function getScores() {
  const res = await fetch(`${BASE}/api/scores`);
  if (!res.ok) throw new Error("Could not load the leaderboard");
  return res.json();
}

export async function saveScore({ name, score, level }) {
  const res = await fetch(`${BASE}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score, level }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Could not save your score");
  }
  return res.json();
}
