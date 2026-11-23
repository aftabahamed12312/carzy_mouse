// Wall bit flags per cell.
export const N = 1, E = 2, S = 4, W = 8;
export const DIRS = [N, E, S, W];
const DX = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 };
const DY = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 };
const OPP = { [N]: S, [E]: W, [S]: N, [W]: E };

const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.cols && y < m.rows;

// Recursive-backtracker maze, then knock out a few walls so there are loops
// (otherwise the cat could never be dodged in a perfect maze).
export function generateMaze(cols, rows) {
  const m = { cols, rows, cells: new Array(cols * rows).fill(N | E | S | W) };
  const seen = new Uint8Array(cols * rows);
  const stack = [0];
  seen[0] = 1;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols, cy = (cur / cols) | 0;
    const opts = DIRS.filter((d) => {
      const nx = cx + DX[d], ny = cy + DY[d];
      return inside(m, nx, ny) && !seen[ny * cols + nx];
    });
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[(Math.random() * opts.length) | 0];
    const ni = (cy + DY[d]) * cols + (cx + DX[d]);
    m.cells[cur] &= ~d;
    m.cells[ni] &= ~OPP[d];
    seen[ni] = 1;
    stack.push(ni);
  }
  const extra = Math.floor(cols * rows * 0.1);
  for (let i = 0; i < extra; i++) {
    const x = (Math.random() * cols) | 0, y = (Math.random() * rows) | 0;
    const d = DIRS[(Math.random() * 4) | 0];
    const nx = x + DX[d], ny = y + DY[d];
    if (!inside(m, nx, ny)) continue;
    m.cells[y * cols + x] &= ~d;
    m.cells[ny * cols + nx] &= ~OPP[d];
  }
  return m;
}

export const canMove = (m, x, y, d) => !(m.cells[y * m.cols + x] & d);
export const move = (x, y, d) => [x + DX[d], y + DY[d]];

// Breadth-first search: returns the first step the cat should take toward the mouse.
export function nextStepToward(m, from, to) {
  if (from.x === to.x && from.y === to.y) return null;
  const { cols, rows } = m;
  const start = from.y * cols + from.x, goal = to.y * cols + to.x;
  const first = new Int8Array(cols * rows).fill(-1);
  const seen = new Uint8Array(cols * rows);
  const q = [start];
  seen[start] = 1;
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    const cx = cur % cols, cy = (cur / cols) | 0;
    for (const d of DIRS) {
      if (!canMove(m, cx, cy, d)) continue;
      const ni = (cy + DY[d]) * cols + (cx + DX[d]);
      if (seen[ni]) continue;
      seen[ni] = 1;
      first[ni] = cur === start ? d : first[cur];
      if (ni === goal) return first[ni];
      q.push(ni);
    }
  }
  return null;
}

// Farthest cell from a start point, used to place the exit.
export function farthestCell(m, sx, sy) {
  const { cols, rows } = m;
  const dist = new Int16Array(cols * rows).fill(-1);
  const q = [sy * cols + sx];
  dist[q[0]] = 0;
  let last = q[0];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    last = cur;
    const cx = cur % cols, cy = (cur / cols) | 0;
    for (const d of DIRS) {
      if (!canMove(m, cx, cy, d)) continue;
      const ni = (cy + DY[d]) * cols + (cx + DX[d]);
      if (dist[ni] === -1) { dist[ni] = dist[cur] + 1; q.push(ni); }
    }
  }
  return { x: last % cols, y: (last / cols) | 0 };
}
