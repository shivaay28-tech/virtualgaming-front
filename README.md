# Virtual Gaming — Frontend

React client for AI Teen Patti 20-20: table lobby, VIP rooms, live virtual dealer, and synced card animations.

## Setup

```bash
yarn install
cp .env.example .env
```

## Run

```bash
yarn start
```

Open [http://localhost:3000](http://localhost:3000) for the player app. Admin console: `yarn start:admin` → [http://localhost:3001](http://localhost:3001).

## Split deploy builds

```bash
yarn build:player   # deploy to play.example.com
yarn build:admin    # deploy to admin.example.com
```

## Environment

| Variable | Description |
|----------|-------------|
| `REACT_APP_BACKEND_URL` | FastAPI backend URL (default `http://localhost:8000`) |

## Production (Vercel)

Deploy **two Vercel projects** — one for player, one for admin:

| Project | Build command | Domain example |
|---------|---------------|----------------|
| Player | `yarn build:player` | `play.yourdomain.com` |
| Admin | `yarn build:admin` | `admin.yourdomain.com` |

Set `REACT_APP_BACKEND_URL=https://api.yourdomain.com` on both.

`vercel.json` includes SPA rewrites for React Router. Full guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Backend repo: [virtualgaming-back](https://github.com/shivaay28-tech/virtualgaming-back).
