# Production deployment guide (frontend)

Deploy **two separate Vercel projects** from this repo — one for the player app, one for the admin console.

Backend API: [virtualgaming-back](https://github.com/shivaay28-tech/virtualgaming-back) (DigitalOcean App Platform + MongoDB Atlas + Upstash Redis).

```
┌─────────────────┐     ┌─────────────────┐
│ play.domain.com │     │ admin.domain.com│
│    (Vercel)     │     │    (Vercel)     │
└────────┬────────┘     └────────┬────────┘
         │  HTTPS + cookies       │
         └──────────┬─────────────┘
                    ▼
         ┌──────────────────────┐
         │  api.domain.com      │
         │  DigitalOcean        │
         └──────────────────────┘
```

---

## 1. Player app (`play.yourdomain.com`)

| Setting | Value |
|---------|-------|
| Root directory | repo root |
| Framework preset | Create React App |
| Build command | `yarn build:player` |
| Output directory | `build` |
| Install command | `yarn install` |

**Environment variables:**

```text
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_PLAYER_URL=https://play.yourdomain.com
```

---

## 2. Admin app (`admin.yourdomain.com`)

| Setting | Value |
|---------|-------|
| Build command | `yarn build:admin` |
| Output directory | `build` |
| Install command | `yarn install` |

**Environment variables:**

```text
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

---

## 3. Vercel project setup

1. Import this GitHub repo in [Vercel](https://vercel.com/new).
2. Create **Project A** (player) with `yarn build:player`.
3. Duplicate or create **Project B** (admin) from the same repo with `yarn build:admin`.
4. Add custom domains on each project.
5. `vercel.json` in this repo configures SPA routing rewrites and security headers.

---

## 4. Backend coordination

After deploying frontends, set backend `CORS_ORIGINS` to both HTTPS origins exactly:

```text
https://play.yourdomain.com,https://admin.yourdomain.com
```

Backend must use:

- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none` (cross-origin Vercel → API)

See [virtualgaming-back SECURITY.md](https://github.com/shivaay28-tech/virtualgaming-back/blob/main/SECURITY.md).

---

## 5. End-to-end checklist

- [ ] Player Vercel build succeeds with `REACT_APP_BACKEND_URL`
- [ ] Admin Vercel build succeeds with same backend URL
- [ ] `play.yourdomain.com` and `admin.yourdomain.com` serve HTTPS
- [ ] Login works (cookies cross-origin)
- [ ] WebSocket connects (`wss://api.yourdomain.com/api/ws`)
- [ ] Live game state updates on player and admin

---

## 6. Multi-tenant (per operator)

Each operator gets:

- Their own backend deployment (`REACT_APP_BACKEND_URL` per tenant)
- Separate Vercel projects or preview branches per brand
- Player and admin builds pointing at that tenant's API

Local single-tenant dev: copy `.env.example` → `.env` and run `yarn start` / `yarn start:admin`.
