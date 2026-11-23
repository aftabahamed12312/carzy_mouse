# 🐭 Cat & Mouse Maze

React (Vite) game + Node/Express API + MongoDB leaderboard.
Frontend deploys to **Cloudflare via Wrangler**, backend deploys to **Vercel**.

```
cat-mouse-maze/
├─ client/   React + Vite  → Cloudflare (wrangler deploy)
└─ server/   Express + Mongoose → Vercel (serverless)
```

## How the game works
- You are the mouse 🐭. Move with **Arrow keys / WASD**, swipe, or the on-screen pad.
- Collect every cheese 🧀 to open the exit 🚪, then reach it.
- The cat 😾 chases you using shortest-path (BFS) and gets faster each level.
- 3 lives. Score = cheese + level bonus + time bonus. Save it to the leaderboard.

## 1. MongoDB
Create a free cluster on MongoDB Atlas, make a database user, and allow network access
`0.0.0.0/0` (Vercel uses dynamic IPs). Copy the connection string.

## 2. Run locally
```bash
# terminal 1 – API
cd server
cp .env.example .env        # paste your MONGODB_URI
npm install
npm run dev                 # http://localhost:4000

# terminal 2 – game
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm install
npm run dev                 # http://localhost:5173
```

## 3. Deploy backend → Vercel
```bash
cd server
npm i -g vercel
vercel                        # first deploy, accept defaults
vercel env add MONGODB_URI    # paste connection string (Production)
vercel env add CLIENT_ORIGIN  # e.g. https://cat-mouse-maze.<you>.workers.dev
vercel --prod
```
Note the production URL, e.g. `https://cat-mouse-api.vercel.app`. Test: `/api/health`.

## 4. Deploy frontend → Cloudflare (Wrangler)
```bash
cd client
echo "VITE_API_URL=https://cat-mouse-api.vercel.app" > .env.production
npm install
npx wrangler login
npm run deploy                # builds, then `wrangler deploy`
```
Wrangler prints your `*.workers.dev` URL. Put that URL in Vercel's `CLIENT_ORIGIN`
(comma-separate multiple origins) and redeploy the backend so CORS allows it.

If the leaderboard is unreachable the game still plays; scores just won't save.
