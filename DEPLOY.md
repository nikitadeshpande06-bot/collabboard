# CollabBoard — Deployment Guide

This project deploys with:
- **Frontend** → [Vercel](https://vercel.com) (free)
- **Backend** → [Railway](https://railway.app) (free tier)
- **Database** → [MongoDB Atlas](https://cloud.mongodb.com) (free M0 cluster)

---

## Step 1 — MongoDB Atlas (database)

1. Go to https://cloud.mongodb.com → **Create a free account**
2. Create a **free M0 cluster** (any region)
3. Under **Database Access** → Add a database user (e.g. `collabboard` / strong password)
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all — Railway needs this)
5. Click **Connect** → **Drivers** → copy the connection string, e.g.:
   ```
   mongodb+srv://collabboard:<password>@cluster0.xxxxx.mongodb.net/whiteboard?retryWrites=true&w=majority
   ```
   Save this — you'll paste it as `MONGO_URI` in Railway.

---

## Step 2 — Push code to GitHub

```bash
git init          # if not already a git repo
git add .
git commit -m "initial commit"
```

Create a repo at https://github.com/new, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/collabboard.git
git push -u origin main
```

---

## Step 3 — Deploy Backend to Railway

1. Go to https://railway.app → **Sign in with GitHub**
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repo → set **Root Directory** to `server`
4. Railway will auto-detect Node.js. Under **Settings → Build Command**:
   ```
   npm install && npm run build
   ```
   And **Start Command**:
   ```
   node dist/index.js
   ```
5. Go to **Variables** tab and add:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `MONGO_URI` | *(paste from Step 1)* |
   | `JWT_SECRET` | *(any long random string, e.g. 64 chars)* |
   | `JWT_REFRESH_SECRET` | *(another long random string)* |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | *(leave blank for now — fill in after Step 4)* |
   | `REDIS_URL` | *(leave blank — Redis is optional, server works without it)* |

6. Railway will deploy. Once done, click the **domain** link — it looks like:
   ```
   https://collabboard-server-production.up.railway.app
   ```
   **Copy this URL** — you need it in the next steps.

7. Test it:
   ```
   https://YOUR_RAILWAY_URL/api/health
   ```
   Should return `{"status":"ok", ...}`

---

## Step 4 — Deploy Frontend to Vercel

1. Go to https://vercel.com → **Sign in with GitHub**
2. Click **Add New → Project** → import your repo
3. Set **Root Directory** to `client`
4. **Framework Preset**: Vite (auto-detected)
5. Under **Environment Variables** add:

   | Key | Value |
   |-----|-------|
   | `VITE_SOCKET_URL` | `https://YOUR_RAILWAY_URL` *(from Step 3)* |

   > `VITE_API_URL` is NOT needed — `client/vercel.json` already proxies `/api` to Railway.

6. **Before clicking Deploy**, open `client/vercel.json` and replace the placeholder:
   ```json
   "destination": "https://REPLACE_WITH_YOUR_RAILWAY_URL/api/:path*"
   ```
   with your actual Railway URL:
   ```json
   "destination": "https://collabboard-server-production.up.railway.app/api/:path*"
   ```
   Commit and push this change first.

7. Click **Deploy**. Vercel builds and deploys in ~2 minutes.
8. Your live URL will be something like:
   ```
   https://collabboard.vercel.app
   ```

---

## Step 5 — Update CORS on Railway

Now that you have your Vercel URL, go back to Railway → Variables and update:

| Key | Value |
|-----|-------|
| `CLIENT_URL` | `https://collabboard.vercel.app` |

Railway redeploys automatically.

---

## Step 6 — Verify

Open your Vercel URL in a browser:

1. ✅ The role-selector landing page loads
2. ✅ Register a new account
3. ✅ Create a room and open the whiteboard
4. ✅ Open in a second browser tab — both cursors should appear in real-time
5. ✅ Draw something — it syncs instantly

---

## Summary of all URLs

| Service | URL |
|---------|-----|
| **Live app** | `https://collabboard.vercel.app` |
| **API health** | `https://YOUR_RAILWAY_URL/api/health` |
| **MongoDB** | Atlas dashboard |

---

## Optional: Add Redis on Railway

For multi-instance Socket.IO scaling (not needed for a single Railway instance):

1. In Railway project → **New** → **Redis**
2. Copy the `REDIS_URL` from the Redis service Variables
3. Paste it as `REDIS_URL` in your server service Variables

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank screen after login | Check `VITE_SOCKET_URL` env var on Vercel |
| 401 errors in network tab | Check `JWT_SECRET` is set on Railway |
| CORS errors | Check `CLIENT_URL` on Railway matches your Vercel URL exactly (no trailing slash) |
| Socket not connecting | Ensure `VITE_SOCKET_URL` points to Railway, not Vercel |
| MongoDB connection refused | Check Atlas IP whitelist includes `0.0.0.0/0` |
