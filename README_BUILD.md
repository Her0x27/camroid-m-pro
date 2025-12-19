# 🚀 Quick Build & Deploy Guide

## For First-Time Setup
```bash
bash setup.sh        # Verify all dependencies
./build.sh --setup   # Full setup + build
```

## For Development
```bash
npm run dev          # Dev server on :5173 with hot reload
```

## For Production

### Option 1: Node.js Server
```bash
./build.sh           # Build frontend + Node.js server
npm run start        # or: NODE_ENV=production node dist/index.cjs
```

### Option 2: Go Server (Recommended)
```bash
./build.sh --go                # Build production with Go
cd dist && ./server --static ./public

# or with Caddy reverse proxy
caddy run --config Caddyfile
```

### Option 3: Full Obfuscation
```bash
./build.sh --go --clean --obfuscate  # Maximum security
cd dist && ./server
```

## Deployment Targets

| Platform | Command | Auto-Deploy |
|----------|---------|------------|
| **Netlify** | `git push` | ✅ Yes (auto) |
| **Vercel** | Use build.sh in build script | Manual |
| **Railway** | Configure build command | Manual |
| **Self-Hosted (Caddy)** | `caddy run --config Caddyfile` | Manual |
| **Self-Hosted (Nginx)** | `nginx` | Manual |
| **Docker** | Build Docker image | Manual |

## Build Output
- Frontend: `dist/public/` (all static files + PWA manifest)
- Backend: `dist/server` (Go binary) OR `dist/index.cjs` (Node.js)
- Ready for production: `dist/`

## Key Features Enabled
✅ Dynamic PWA manifest (server-side generation)
✅ Full code obfuscation (production)
✅ File name anonymization ([hash] only)
✅ XOR + Base64 localStorage encryption
✅ Service Worker for offline support
✅ Security headers (CSP, X-Frame-Options, etc.)
✅ Gzip compression
✅ Smart caching (manifest: no-cache, assets: 1 year)

## For More Info
See `INSTALL.md` for detailed instructions and `replit.md` for architecture.
