# Camroid M - Installation & Build Guide

Complete guide for setting up and building the Camroid M privacy PWA camera application.

## 📋 Prerequisites

### Required Software
- **Node.js** (v16+) with npm
- **Go** (v1.21+)
- **Git** (recommended)
- **Bash** (Linux/macOS) or PowerShell (Windows)

### Replit Environment
If developing on Replit, all tools are pre-installed. Skip system setup and go to **Step 2**.

---

## 🚀 Quick Start (All Platforms)

### Step 1: System Setup (One-time only)

#### Linux/macOS
```bash
chmod +x setup.sh build.sh
bash setup.sh
```

#### macOS (with Homebrew)
```bash
# Install prerequisites
brew install node go

# Then run setup
chmod +x setup.sh build.sh
bash setup.sh
```

#### Debian/Ubuntu
```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y nodejs npm golang-go build-essential

# Then run setup
chmod +x setup.sh build.sh
bash setup.sh
```

#### Windows (PowerShell)
```powershell
# Using Chocolatey (if installed)
choco install nodejs golang

# Or download manually from:
# - https://nodejs.org/
# - https://golang.org/dl/

# Then convert scripts or use Windows Subsystem for Linux (WSL)
```

---

### Step 2: Build Project

#### Development Build (Express + Vite)
```bash
./build.sh
```

Output: `dist/public` (frontend), `dist/index.cjs` (backend)

#### Production Build (Go + static assets)
```bash
./build.sh --go
```

Output: `dist/public` (frontend), `dist/server` (Go binary)

#### Full Production Build (Go + Obfuscation)
```bash
./build.sh --go --clean --obfuscate
```

Output: Everything from above, plus JavaScript obfuscation applied

---

## 📦 Build Options

### `./setup.sh` - Environment Verification
Checks and installs:
- Node.js & npm
- Go toolchain
- Frontend dependencies
- Build tools (Vite, TypeScript, Terser, etc.)

```bash
bash setup.sh
```

### `./build.sh` - Full Build Process

**Basic Usage:**
```bash
./build.sh [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--go` | Build Go binary instead of Node.js |
| `--obfuscate` | Apply JavaScript obfuscation (production) |
| `--clean` | Clean dist folder before build |
| `--setup` | Run setup checks first |
| `--help` | Show help message |

**Common Scenarios:**

```bash
# Development: Quick iteration
./build.sh

# Production with Node.js
./build.sh --clean

# Production with Go (recommended)
./build.sh --go --clean

# Production with maximum obfuscation
./build.sh --go --clean --obfuscate

# Full setup + build (first time)
./build.sh --setup --go --clean
```

---

## 🏃 Running the Application

### Development Mode
```bash
# Auto-reload on file changes, Vite dev server on :5173
npm run dev
```

### Production - Go Server
```bash
# Build first
./build.sh --go

# Run binary
cd dist && ./server --static ./public --port 5000

# Or use convenience script
cd dist && bash run.sh
```

### Production - Node.js Server
```bash
# Build first
./build.sh

# Run with Node.js
NODE_ENV=production node dist/index.cjs

# Or use convenience script
cd dist && bash run.sh
```

### Production - With Reverse Proxy

#### Using Caddy
```bash
# Build first
./build.sh --go

# Start Go server in background
cd dist && ./server --static ./public &

# Start Caddy
cd .. && caddy run --config Caddyfile
```

#### Using Nginx
```bash
# Build first
./build.sh --go

# Start Go server in background
cd dist && ./server --static ./public &

# Start Nginx
sudo systemctl restart nginx
# (Assuming nginx.conf is installed to /etc/nginx/)
```

---

## 🔧 Advanced Configuration

### Go Server Options
```bash
./dist/server \
  --port 5000                    # Server port (default: 5000)
  --host 0.0.0.0                 # Server host (default: 0.0.0.0)
  --static ./public               # Static files path
  --gzip=true                     # Enable gzip compression
  --cache=true                    # Enable cache headers
  --logging=true                  # Enable request logging
  --cache-max-age=31536000        # Cache duration in seconds
```

### Environment Variables
```bash
export PORT=8000
export HOST=127.0.0.1
export NODE_ENV=production
./dist/server
```

### Configuration File
Place `config.json` in static folder:
```json
{
  "PRIVACY_MODE": true,
  "SELECTED_MODULE": "game-2048",
  "DEBUG_MODE": false,
  "AUTO_LOCK_MINUTES": 5,
  "ALLOWED_PROXY_HOSTS": ["api.imgbb.com"],
  "ORIGIN_VALIDATION": {
    "mode": "disabled",
    "allowedHosts": [],
    "allowedPatterns": [],
    "allowedSchemes": ["https"]
  }
}
```

---

## 📊 Build Output Structure

### After `./build.sh --go --obfuscate`

```
dist/
├── public/                    # Frontend static files
│   ├── index.html            # Entry point (no caching)
│   ├── manifest.json         # Generated at runtime
│   ├── sw.js                 # Service Worker
│   ├── assets/
│   │   ├── [hash].js         # Obfuscated + minified (aggressive caching)
│   │   ├── [hash].css        # Minified
│   │   └── [hash].png        # Icons/images
│   ├── favicon.svg
│   ├── game-icon.svg
│   ├── calculator-icon.svg
│   ├── notepad-icon.svg
│   └── config.json           # (optional) configuration file
│
├── server                    # Go binary
├── run.sh                    # Convenience script
└── (Node.js version: index.cjs instead of server)
```

### Frontend Files (dist/public)
- `index.html` - Main entry point (always fresh)
- `manifest.json` - Generated per request by server
- `sw.js` - Service Worker (no cache)
- `assets/[hash].js` - JavaScript bundles (cached 1 year)
- `assets/[hash].css` - Stylesheets (cached 1 year)
- Icons (cached 1 day)

---

## ✅ Troubleshooting

### Build Fails: "Go not found"
```bash
# Install Go from https://golang.org/dl/
# Or on Replit, it's auto-installed
go version  # Should show version 1.21+
```

### Build Fails: "Node.js not found"
```bash
# Install Node.js from https://nodejs.org/
# Or on Replit, use npm package manager
node --version  # Should show v16+
npm --version
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Permission Denied (scripts)
```bash
# Make scripts executable
chmod +x setup.sh build.sh
```

### Manifest Not Updating (Android Chrome)
1. Clear site data: DevTools → Application → Clear site data
2. Restart browser completely
3. Uninstall and reinstall app

---

## 🌐 Deployment

### Netlify (Recommended)
```bash
# Already configured in netlify.toml
git push  # Auto-deploys on git push
```

### Vercel / Railway / Heroku
```bash
# Use build.sh in pre-build script
# Then point to dist/ for deployment
```

### Self-Hosted (VPS/Server)
```bash
# 1. Build on your machine
./build.sh --go --obfuscate

# 2. Transfer dist/ folder to server
scp -r dist/ user@server:/app/

# 3. On server, start process
cd /app && ./dist/server --static ./dist/public

# 4. (Optional) Use reverse proxy
# Copy Caddyfile or nginx.conf, configure domain & SSL
```

### Docker
```dockerfile
# Dockerfile (example)
FROM golang:1.24-alpine AS builder
COPY server-go /src
WORKDIR /src
RUN go build -o /app/server main.go

FROM alpine:latest
COPY --from=builder /app/server /app/
COPY dist/public /app/public
WORKDIR /app
EXPOSE 5000
CMD ["./server", "--static", "./public"]
```

---

## 📈 Performance Tips

1. **Enable Obfuscation for Production**
   ```bash
   ./build.sh --go --obfuscate
   ```

2. **Use Gzip Compression**
   - Automatic with Go server
   - Configure nginx/Caddy reverse proxy

3. **Enable Browser Caching**
   - Already configured via Cache-Control headers
   - Assets with hash are cached for 1 year

4. **Monitor Bundle Size**
   ```bash
   # After build
   du -sh dist/public
   ls -lh dist/public/assets/ | grep ".js"
   ```

5. **Use Reverse Proxy (Nginx/Caddy)**
   - Better performance than direct Go server
   - Automatic HTTPS
   - Load balancing support

---

## 📚 Additional Resources

- **PWA Documentation**: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- **React + TypeScript**: https://react.dev
- **Vite**: https://vitejs.dev
- **Go**: https://golang.org
- **Tailwind CSS**: https://tailwindcss.com

---

## 🔒 Security Checklist

- [ ] All JavaScript is obfuscated in production builds
- [ ] File names anonymized ([hash] only, no [name])
- [ ] HTTPS configured (via Caddy/nginx/Let's Encrypt)
- [ ] Content Security Policy headers enabled
- [ ] CORS properly configured
- [ ] API endpoints protected if needed
- [ ] Secrets stored in environment variables
- [ ] Regular dependency updates: `npm audit fix`

---

## 📝 Version Info

- **Camroid M**: 1.0.0
- **Node.js**: v16+
- **Go**: v1.21+
- **React**: 18.3.1
- **TypeScript**: 5.6.3
- **Vite**: 7.2.4

---

## 💬 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `replit.md` for architecture details
3. Check console logs: `npm run dev 2>&1`
4. Build with verbose output: `npm run build -- --debug`

---

**Happy building! 🚀**
