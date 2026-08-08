# CollabBoard — Deployment Guide

Get a live public URL in ~15 minutes using free tiers of:

| Service | Purpose | Free? |
|---------|---------|-------|
| [MongoDB Atlas](https://cloud.mongodb.com) | Database | ✅ Free M0 |
| [Railway](https://railway.app) | Backend (Node + Socket.IO) | ✅ $5 credit/mo |
| [Vercel](https://vercel.com) | Frontend (React + Vite) | ✅ Free |

---

## Step 1 — Push your code to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "initial commit"
```

Go to https://github.com/new → create a new repo, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/collabboard.git
git push -u origin main
```

---

## Step 2 — MongoDB Atlas (database)

1. Go to https://cloud.mongodb.com → **Sign up free**
2. Create a **free M0 cluster** (choose any region)
3. **Database Access** → Add user: username `collabboard`, strong password — note it down
4. **Network Access** → Add IP address `0.0.0.0/0` (allows Railway to connect)
5. **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://collabboard:<password>@cluster0.xxxxx.mongodb.net/whiteboard?retryWrites=true&w=majority
   ```
   Replace `<password>` with your actual password. **Save this string.**

---

## Step 3 — Deploy Backend to Railway

1. Go to https://railway.app → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo** → select your repo
3. When asked for a **Root Directory**, type: `server`
4. Railway detects Node.js automatically. Click **Deploy**
5. Once deployed, go to **Variables** tab and add ALL of these:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `MONGO_URI` | *(paste from Step 2)* |
   | `JWT_SECRET` | *(any 64-char random string — use [this generator](https://generate-secret.vercel.app/64))* |
   | `JWT_REFRESH_SECRET` | *(another 64-char random string — different from above)* |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | *(leave blank for now — fill in after Step 4)* |
   | `ADMIN_SECRET` | *(any password you choose — used to access the admin panel)* |

6. Go to **Settings** → **Networking** → **Generate Domain**
   Your backend URL will look like:
   ```
   https://collabboard-server-production.up.railway.app
   ```
   **Copy this URL — you need it in Steps 4 and 5.**

7. Test it works by opening this in your browser:
   ```
   https://YOUR_RAILWAY_URL/api/health
   ```
   You should see: `{"status":"ok","timestamp":"..."}`

---

## Step 4 — Configure the frontend for production

Open `client/vercel.json` and replace **both** occurrences of:
```
https://REPLACE_WITH_YOUR_RAILWAY_URL
```
with your actual Railway URL from Step 3, for example:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://collabboard-server-production.up.railway.app/api/:path*"
    },
    {
      "source": "/socket.io/:path*",
      "destination": "https://collabboard-server-production.up.railway.app/socket.io/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Commit and push this change:
```bash
git add client/vercel.json
git commit -m "set railway url in vercel rewrites"
git push
```

---

## Step 5 — Deploy Frontend to Vercel

1. Go to https://vercel.com → **Sign in with GitHub**
2. **Add New → Project** → import your repo
3. Vercel will auto-detect the root `vercel.json`. **Do not change any settings.**
4. Under **Environment Variables**, add:

   | Variable | Value |
   |----------|-------|
   | `VITE_SOCKET_URL` | *(your Railway URL from Step 3, e.g. `https://collabboard-server-production.up.railway.app`)* |

5. Click **Deploy**. Vercel builds and goes live in ~2 minutes.
6. Your live URL will be something like:
   ```
   https://collabboard.vercel.app
   ```
   **Copy this URL.**

---

## Step 6 — Update CORS on Railway

Go back to Railway → your server service → **Variables** and update:

| Variable | Value |
|----------|-------|
| `CLIENT_URL` | *(your Vercel URL from Step 5, e.g. `https://collabboard.vercel.app`)* |

> ⚠️ No trailing slash. Must match exactly.

Railway redeploys automatically (~30 seconds).

---

## Step 7 — Verify everything works ✅

Open your Vercel URL:

1. ✅ Landing page loads
2. ✅ Click **Sign Up** → choose **User** → register an account
3. ✅ Create a room and open the whiteboard
4. ✅ Open the same URL in a second browser tab — both cursors appear in real time
5. ✅ Draw something — it syncs instantly between tabs
6. ✅ Click **Sign In** → choose **Admin** → enter your `ADMIN_SECRET` → admin panel loads
7. ✅ On the **Users** tab, click **Export Excel** → `.xlsx` file downloads

---

## Summary

| Thing | URL |
|-------|-----|
| **Live app** | `https://collabboard.vercel.app` *(your Vercel URL)* |
| **API health check** | `https://YOUR_RAILWAY_URL/api/health` |
| **Admin panel** | `https://collabboard.vercel.app/admin` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank screen / white page | Check `VITE_SOCKET_URL` is set on Vercel (no trailing slash) |
| 401 errors in network tab | Check `JWT_SECRET` is set on Railway |
| CORS errors in console | `CLIENT_URL` on Railway must match your Vercel URL exactly |
| Socket not connecting | `VITE_SOCKET_URL` must point to Railway, not Vercel |
| MongoDB connection error | Atlas Network Access must allow `0.0.0.0/0` |
| Admin panel says "invalid secret" | Enter the same value you set as `ADMIN_SECRET` on Railway |

---

## Optional: Add Redis (for multi-instance scaling)

Not needed for a single Railway instance. If you ever scale to multiple instances:

1. Railway project → **New** → **Redis**
2. Copy the `REDIS_URL` from the Redis service Variables
3. Paste it as `REDIS_URL` in your server service Variables
