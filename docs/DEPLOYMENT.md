# BankWise CI/CD & Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GITHUB REPOSITORY                           │
│  ┌─────────────────┐                    ┌─────────────────────┐    │
│  │    backend/     │                    │   frontend/frontend/ │    │
│  │  (Spring Boot)  │                    │      (React/Vite)    │    │
│  └────────┬────────┘                    └──────────┬──────────┘    │
└───────────┼─────────────────────────────────────────┼───────────────┘
            │ git push                                │ git push
            ▼                                         ▼
┌───────────────────────┐                 ┌───────────────────────┐
│   GitHub Actions      │                 │       Netlify         │
│   (Build & Push)      │                 │   (Auto-detected)     │
└───────────┬───────────┘                 └───────────┬───────────┘
            │ Docker Image                            │ npm build
            ▼                                         ▼
┌───────────────────────┐                 ┌───────────────────────┐
│   GitHub Container    │                 │   Netlify CDN         │
│   Registry (GHCR)     │                 │   (Global Edge)       │
└───────────┬───────────┘                 └───────────┬───────────┘
            │ Pull & Deploy                           │
            ▼                                         ▼
┌───────────────────────┐                 ┌───────────────────────┐
│   Render.com          │                 │   Users               │
│   (Docker Service)    │◄───────────────►│   bankwise.netlify.app│
└───────────┬───────────┘  API Calls      └───────────────────────┘
            │
            ▼
┌───────────────────────┐
│   Neon PostgreSQL     │
│   (Managed Database)  │
└───────────────────────┘
```

---

## How Docker Images & Containers Work

### Immutability Principle

**Docker images are immutable** - once built, they never change. This is crucial for:

1. **Reproducibility**: Same image = same behavior everywhere
2. **Rollback**: Keep old images, instantly revert if needed
3. **Auditing**: Know exactly what code is running (via commit SHA tag)

```
┌─────────────────────────────────────────────────────────────┐
│  Image: ghcr.io/username/bankwise-backend:abc123f          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Layer 1: eclipse-temurin:17-jre-alpine (base OS)     │  │
│  │  Layer 2: Spring user & permissions                   │  │
│  │  Layer 3: app.jar (your compiled code)                │  │
│  │  Layer 4: Environment config                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  Metadata: Created 2026-01-26, Commit: abc123f              │
└─────────────────────────────────────────────────────────────┘
```

### Why Updating = Building a New Image

You **cannot modify** a running container's code. To update:

```
Old Version                    New Version
┌────────────────┐            ┌────────────────┐
│ Image: abc123f │ ───────X───│ Image: def456g │
│ (immutable)    │   update   │ (immutable)    │
└────────────────┘            └────────────────┘
        │                             │
        ▼                             ▼
┌────────────────┐            ┌────────────────┐
│ Container A    │   stop     │ Container B    │
│ (running)      │ ─────────► │ (running)      │
└────────────────┘   start    └────────────────┘
```

**Process:**
1. Push code to GitHub
2. GitHub Actions builds NEW image with NEW tag
3. Render pulls new image and starts new container
4. Old container is stopped and removed
5. Traffic routes to new container

---

## Deployment Flow (Step-by-Step)

### Backend Deployment

```
┌──────────────────────────────────────────────────────────────────┐
│  Developer pushes to main branch                                 │
│  $ git push origin main                                          │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  GitHub detects push to backend/** files                         │
│  Triggers: .github/workflows/backend-deploy.yml                  │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  GitHub Actions Runner (ubuntu-latest)                           │
│  1. Checkout code                                                │
│  2. Setup Docker Buildx                                          │
│  3. Login to GHCR (ghcr.io)                                      │
│  4. Build Docker image (multi-stage)                             │
│     - Stage 1: maven:3.9-temurin-17 → compile JAR                │
│     - Stage 2: temurin:17-jre-alpine → minimal runtime           │
│  5. Tag image:                                                   │
│     - ghcr.io/username/bankwise-backend:abc123f (commit SHA)     │
│     - ghcr.io/username/bankwise-backend:main                     │
│     - ghcr.io/username/bankwise-backend:20260126-143022          │
│  6. Push to GHCR                                                 │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Render.com detects new image in registry                        │
│  (or receives webhook trigger)                                   │
│  1. Pulls new image from GHCR                                    │
│  2. Starts new container with env vars                           │
│  3. Runs health check: GET /actuator/health                      │
│  4. If healthy → routes traffic to new container                 │
│  5. Stops old container                                          │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  ✅ New version live at: https://bankwise-api.onrender.com       │
│  Zero downtime (Render handles blue-green deployment)            │
└──────────────────────────────────────────────────────────────────┘
```

**Time: ~3-5 minutes total**

### Frontend Deployment

```
┌──────────────────────────────────────────────────────────────────┐
│  Developer pushes to main branch                                 │
│  $ git push origin main                                          │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Netlify detects push (GitHub integration)                       │
│  Auto-triggers build                                             │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Netlify Build Server                                            │
│  1. Clone repo                                                   │
│  2. cd frontend/frontend                                         │
│  3. npm ci (install dependencies)                                │
│  4. VITE_API_BASE_URL=https://bankwise-api.onrender.com          │
│  5. npm run build                                                │
│  6. Output: dist/ folder with static files                       │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Netlify CDN Deployment                                          │
│  1. Upload dist/* to global edge network                         │
│  2. Atomic deploy (instant switch)                               │
│  3. Invalidate CDN cache                                         │
└─────────────────────────┬────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  ✅ New version live at: https://bankwise.netlify.app            │
│  Instant rollback available via Netlify dashboard                │
└──────────────────────────────────────────────────────────────────┘
```

**Time: ~1-2 minutes total**

---

## Rollback Strategy

### Backend Rollback (Docker Image Tags)

Every image is tagged with the **commit SHA**, making rollback trivial:

```bash
# Current deployment
ghcr.io/username/bankwise-backend:abc123f  ← Running now

# Previous versions (always available)
ghcr.io/username/bankwise-backend:def456g  ← Yesterday
ghcr.io/username/bankwise-backend:789xyz1  ← Last week
```

**To rollback on Render:**

1. **Manual (Dashboard):**
   - Go to Render Dashboard → Service → Settings
   - Change image tag to previous SHA: `ghcr.io/username/bankwise-backend:def456g`
   - Render pulls old image and deploys

2. **Via Render API:**
   ```bash
   curl -X POST "https://api.render.com/v1/services/{service_id}/deploys" \
     -H "Authorization: Bearer $RENDER_API_KEY" \
     -d '{"imageUrl": "ghcr.io/username/bankwise-backend:def456g"}'
   ```

3. **Git Revert (triggers new build):**
   ```bash
   git revert HEAD
   git push origin main
   # New image built, deployed automatically
   ```

### Frontend Rollback (Netlify)

Netlify keeps **every deploy** as an immutable snapshot:

1. **Dashboard:**
   - Go to Netlify → Site → Deploys
   - Click any previous deploy
   - Click "Publish deploy"
   - Instant rollback (< 1 second)

2. **CLI:**
   ```bash
   netlify deploy --prod --dir=dist  # Deploy local build
   ```

---

## Environment Variables

### Backend (Set in Render Dashboard)

| Variable | Example | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://...neon.tech/bankwise` | Neon DB URL |
| `SPRING_DATASOURCE_USERNAME` | `bankwise_user` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | `***` | DB password |
| `JWT_SECRET` | `your-256-bit-secret` | JWT signing key |
| `CORS_ALLOWED_ORIGINS` | `https://bankwise.netlify.app` | Allowed frontends |
| `SPRING_PROFILES_ACTIVE` | `prod` | Spring profile |

### Frontend (Set in Netlify Dashboard or netlify.toml)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `https://bankwise-api.onrender.com` | Backend API URL |

---

## CI/CD Automates These Manual Steps

### Without CI/CD (Manual Process):
```bash
# Backend (every deploy):
cd backend
mvn clean package -DskipTests
docker build -t bankwise-backend .
docker tag bankwise-backend ghcr.io/user/bankwise-backend:v1.2.3
docker push ghcr.io/user/bankwise-backend:v1.2.3
# Then manually update Render...

# Frontend (every deploy):
cd frontend/frontend
npm install
VITE_API_BASE_URL=https://api.example.com npm run build
# Then manually upload dist/ to Netlify...
```

**Problems:**
- Error-prone (typos, forgotten steps)
- Inconsistent environments
- No audit trail
- Slow and repetitive

### With CI/CD (Automated):
```bash
git push origin main
# ☕ Done. Go get coffee.
```

**Benefits:**
- ✅ Consistent builds every time
- ✅ Automatic testing before deploy
- ✅ Full audit trail (who, what, when)
- ✅ Fast rollback via image tags
- ✅ No human error in deploy process

---

## Frontend & Backend Independence

The deployments are **independent but connected**:

```
Frontend (Netlify)              Backend (Render)
       │                              │
       │ VITE_API_BASE_URL            │
       │ ─────────────────────────────┤
       │                              │
       ▼                              │
┌─────────────────┐                   │
│ Built into JS   │                   │
│ at build time   │                   │
└────────┬────────┘                   │
         │                            │
         │ Runtime API calls          │
         └────────────────────────────►

```

**Key Points:**

1. **Frontend can deploy without backend** (uses existing API)
2. **Backend can deploy without frontend** (API-first, independent)
3. **Environment variable connects them** (`VITE_API_BASE_URL`)
4. **Version mismatch possible** - design APIs with backward compatibility

---

## Setup Checklist

### One-Time Setup

#### GitHub
- [x] Repository exists with backend/ and frontend/ folders
- [ ] Enable GitHub Packages for GHCR (Settings → Packages)
- [ ] Add secrets if needed: `RENDER_DEPLOY_HOOK_URL`

#### Render
- [ ] Create new Web Service
- [ ] Connect to GHCR: `ghcr.io/username/bankwise-backend`
- [ ] Set environment variables (database, JWT, CORS)
- [ ] Enable auto-deploy on image push
- [ ] Note the service URL for frontend config

#### Netlify
- [ ] Import site from GitHub
- [ ] Set base directory: `frontend/frontend`
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Add environment variable: `VITE_API_BASE_URL`
- [ ] Enable auto-deploy on git push

### Verify Deployment
```bash
# Push to main
git add .
git commit -m "feat: setup CI/CD"
git push origin main

# Watch GitHub Actions
# Watch Netlify deploys
# Check Render logs

# Test
curl https://bankwise-api.onrender.com/actuator/health
open https://bankwise.netlify.app
```

---

## Troubleshooting

### Backend Build Fails
```bash
# Check GitHub Actions logs
# Common issues:
# - Maven dependency not found → check pom.xml
# - Docker build error → check Dockerfile
# - GHCR push denied → check permissions in workflow
```

### Frontend Build Fails
```bash
# Check Netlify deploy logs
# Common issues:
# - Node version mismatch → check netlify.toml
# - Missing dependencies → npm ci should fix
# - Build error → run locally first: npm run build
```

### API Connection Fails
```bash
# Check CORS settings on backend
# Check VITE_API_BASE_URL on frontend
# Check Render logs for errors
```
