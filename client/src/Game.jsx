import React, { useCallback, useEffect, useRef, useState } from "react";
import { N, E, S, W, canMove, farthestCell, generateMaze, move, nextStepToward } from "./maze.js";

const KEYS = {
  ArrowUp: N, w: N, W: N, ArrowRight: E, d: E, D: E,
  ArrowDown: S, s: S, S: S, ArrowLeft: W, a: W, A: W,
};
const GRACE_MS = 1800; // the cat naps at the start of each round

function buildLevel(level) {
  const size = Math.min(8 + level * 2, 20);
  const maze = generateMaze(size, size);
  const mouse = { x: 0, y: 0 };
  const far = farthestCell(maze, 0, 0);
  const exit = { x: far.x, y: far.y };
  const cat = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
  const taken = new Set(["0,0", `${exit.x},${exit.y}`, `${cat.x},${cat.y}`]);
  const cheese = [];
  const want = Math.min(3 + level, 10);
  while (cheese.length < want) {
    const x = (Math.random() * size) | 0, y = (Math.random() * size) | 0;
    if (taken.has(`${x},${y}`)) continue;
    taken.add(`${x},${y}`);
    cheese.push({ x, y });
  }
  return { maze, mouse, cat, exit, cheese, catEvery: Math.max(170, 540 - level * 45) };
}

export default function Game({ onGameOver }) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const g = useRef(null); // mutable game state, kept out of React renders
  const [hud, setHud] = useState({ level: 1, lives: 3, score: 0, cheese: 0, total: 0, open: false });
  const [banner, setBanner] = useState("");

  const sync = useCallback(() => {
    const s = g.current;
    setHud({
      level: s.level, lives: s.lives, score: s.score,
      cheese: s.total - s.cheese.length, total: s.total, open: s.cheese.length === 0,
    });
  }, []);

  const startLevel = useCallback((level, keep) => {
    const L = buildLevel(level);
    const now = performance.now();
    g.current = {
      ...(keep || { lives: 3, score: 0 }),
      ...L, level, total: L.cheese.length,
      startedAt: now, napUntil: now + GRACE_MS, lastCat: now, frozen: false,
    };
    sync();
  }, [sync]);

  useEffect(() => { startLevel(1); }, [startLevel]);

  const loseLife = useCallback(() => {
    const s = g.current;
    if (s.frozen) return;
    s.lives -= 1;
    if (s.lives <= 0) {
      s.frozen = true;
      sync();
      onGameOver({ score: s.score, level: s.level });
      return;
    }
    s.mouse = { x: 0, y: 0 };
    s.cat = { x: Math.floor(s.maze.cols / 2), y: Math.floor(s.maze.rows / 2) };
    s.napUntil = performance.now() + GRACE_MS;
    setBanner(`Caught! ${s.lives} ${s.lives === 1 ? "life" : "lives"} left`);
    setTimeout(() => setBanner(""), 1100);
    sync();
  }, [onGameOver, sync]);

  const tryMove = useCallback((d) => {
    const s = g.current;
    if (!s || s.frozen) return;
    const { x, y } = s.mouse;
    if (!canMove(s.maze, x, y, d)) return;
    const [nx, ny] = move(x, y, d);
    s.mouse = { x: nx, y: ny };

    const i = s.cheese.findIndex((c) => c.x === nx && c.y === ny);
    if (i >= 0) { s.cheese.splice(i, 1); s.score += 100; sync(); }

    if (s.cat.x === nx && s.cat.y === ny) return loseLife();

    if (s.cheese.length === 0 && nx === s.exit.x && ny === s.exit.y) {
      const secs = (performance.now() - s.startedAt) / 1000;
      const bonus = 500 + Math.max(0, Math.round(300 - secs * 5));
      s.score += bonus;
      s.frozen = true;
      setBanner(`Level ${s.level} clear! +${bonus}`);
      const next = { lives: s.lives, score: s.score };
      const lvl = s.level + 1;
      setTimeout(() => { setBanner(""); startLevel(lvl, next); }, 1200);
      sync();
    }
  }, [loseLife, startLevel, sync]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      const d = KEYS[e.key];
      if (!d) return;
      e.preventDefault();
      tryMove(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove]);

  // Cat AI + render loop
  useEffect(() => {
    let raf;
    const frame = (now) => {
      const s = g.current;
      if (s && !s.frozen && now >= s.napUntil && now - s.lastCat >= s.catEvery) {
        s.lastCat = now;
        const d = nextStepToward(s.maze, s.cat, s.mouse);
        if (d) {
          const [nx, ny] = move(s.cat.x, s.cat.y, d);
          s.cat = { x: nx, y: ny };
          if (nx === s.mouse.x && ny === s.mouse.y) loseLife();
        }
      }
      if (s) draw(canvasRef.current, boxRef.current, s, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [loseLife]);

  // Swipe controls for touch screens
  const touch = useRef(null);
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = [t.clientX, t.clientY]; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current[0], dy = t.clientY - touch.current[1];
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? E : W) : (dy > 0 ? S : N));
  };

  return (
    <section className="game">
      <div className="hud" aria-live="polite">
        <span>Level <b>{hud.level}</b></span>
        <span>Lives <b>{"❤️".repeat(Math.max(hud.lives, 0)) || "0"}</b></span>
        <span>Cheese <b>{hud.cheese}/{hud.total}</b></span>
        <span>Score <b>{hud.score}</b></span>
      </div>
      <p className="hint">{hud.open ? "The exit is open. Run for the door!" : "Collect all the cheese to open the exit."}</p>
      <div className="board" ref={boxRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <canvas ref={canvasRef} />
        {banner && <div className="banner">{banner}</div>}
      </div>
      <div className="pad" aria-label="Move controls">
        <button onClick={() => tryMove(N)} aria-label="Up">▲</button>
        <button onClick={() => tryMove(W)} aria-label="Left">◀</button>
        <button onClick={() => tryMove(S)} aria-label="Down">▼</button>
        <button onClick={() => tryMove(E)} aria-label="Right">▶</button>
      </div>
    </section>
  );
}

function draw(canvas, box, s, now) {
  if (!canvas || !box) return;
  const { maze, mouse, cat, exit, cheese } = s;
  const avail = Math.min(box.clientWidth, 640);
  const cell = Math.floor(avail / maze.cols);
  const px = cell * maze.cols;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(px * dpr)) {
    canvas.width = Math.round(px * dpr); canvas.height = Math.round(px * dpr);
    canvas.style.width = px + "px"; canvas.style.height = px + "px";
  }
  const c = canvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = "#fff1c1";
  c.fillRect(0, 0, px, px);

  const open = cheese.length === 0;
  c.font = `${cell * 0.7}px serif`;
  c.textAlign = "center"; c.textBaseline = "middle";
  c.globalAlpha = open ? 1 : 0.35;
  c.fillText("🚪", (exit.x + 0.5) * cell, (exit.y + 0.55) * cell);
  c.globalAlpha = 1;

  const bob = Math.sin(now / 250) * cell * 0.04;
  for (const ch of cheese) c.fillText("🧀", (ch.x + 0.5) * cell, (ch.y + 0.55) * cell + bob);

  c.strokeStyle = "#3b1f4a";
  c.lineWidth = Math.max(2, cell * 0.1);
  c.lineCap = "round";
  c.beginPath();
  for (let y = 0; y < maze.rows; y++) for (let x = 0; x < maze.cols; x++) {
    const w = maze.cells[y * maze.cols + x];
    const x0 = x * cell, y0 = y * cell;
    if (w & N) { c.moveTo(x0, y0); c.lineTo(x0 + cell, y0); }
    if (w & W) { c.moveTo(x0, y0); c.lineTo(x0, y0 + cell); }
    if (y === maze.rows - 1 && w & S) { c.moveTo(x0, y0 + cell); c.lineTo(x0 + cell, y0 + cell); }
    if (x === maze.cols - 1 && w & E) { c.moveTo(x0 + cell, y0); c.lineTo(x0 + cell, y0 + cell); }
  }
  c.stroke();

  c.font = `${cell * 0.72}px serif`;
  c.fillText("🐭", (mouse.x + 0.5) * cell, (mouse.y + 0.55) * cell);
  c.fillText(now < s.napUntil ? "😴" : "😾", (cat.x + 0.5) * cell, (cat.y + 0.55) * cell);
}
