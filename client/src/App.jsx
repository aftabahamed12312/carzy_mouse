import React, { useEffect, useState } from "react";
import Game from "./Game.jsx";
import { getScores, saveScore } from "./api.js";

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu | play | over
  const [result, setResult] = useState({ score: 0, level: 1 });
  const [round, setRound] = useState(0);

  const play = () => { setRound((r) => r + 1); setScreen("play"); };

  return (
    <main className="app">
      <header>
        <h1>Cat &amp; Mouse Maze</h1>
        <p className="sub">Grab the cheese. Dodge the cat. Find the door.</p>
      </header>

      {screen === "menu" && (
        <div className="panel">
          <p>Move with the arrow keys or WASD. On a phone, swipe or use the pad.</p>
          <div className="row"><button className="primary" onClick={play}>Start game</button></div>
          <Leaderboard />
        </div>
      )}

      {screen === "play" && (
        <Game key={round} onGameOver={(r) => { setResult(r); setScreen("over"); }} />
      )}

      {screen === "over" && (
        <GameOver result={result} onAgain={play} onMenu={() => setScreen("menu")} />
      )}
    </main>
  );
}

function GameOver({ result, onAgain, onMenu }) {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("cm-name") || ""; } catch { return ""; }
  });
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus("saving");
    try {
      try { localStorage.setItem("cm-name", name.trim()); } catch { /* ignore */ }
      await saveScore({ name: name.trim(), ...result });
      setStatus("saved");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="panel">
      <h2>The cat got you</h2>
      <p className="big">{result.score} points, reached level {result.level}</p>
      {status !== "saved" ? (
        <form onSubmit={submit} className="row">
          <label htmlFor="nm">Your name</label>
          <input id="nm" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Mouse name" />
          <button className="primary" disabled={status === "saving" || !name.trim()}>
            {status === "saving" ? "Saving…" : "Save score"}
          </button>
        </form>
      ) : (
        <p className="ok">Score saved.</p>
      )}
      {status === "error" && <p className="err">{error}. Check that the API is running, then try again.</p>}
      <div className="row">
        <button className="primary" onClick={onAgain}>Play again</button>
        <button onClick={onMenu}>Menu</button>
      </div>
      {status === "saved" && <Leaderboard />}
    </div>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    getScores().then(setRows).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="board-list">
      <h2>Top mice</h2>
      {err && <p className="err">{err}. The game still works without it.</p>}
      {!err && !rows && <p>Loading…</p>}
      {rows && rows.length === 0 && <p>No scores yet. Be the first.</p>}
      {rows && rows.length > 0 && (
        <ol>
          {rows.map((r) => (
            <li key={r._id}><span>{r.name}</span><span>Lv {r.level}</span><b>{r.score}</b></li>
          ))}
        </ol>
      )}
    </div>
  );
}
