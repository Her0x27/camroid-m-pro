# Camroid M - Privacy-Focused PWA Camera Application

## Overview
**Camroid M** is a privacy-focused Progressive Web Application (PWA) that functions as a tactical camera with GPS, compass, and precision overlays. The app features dynamic manifest generation that allows it to disguise itself as different applications (Game 2048, Calculator, or Notepad) when privacy mode is enabled.

**Key Features:**
- Dynamic PWA manifest generation without backend dependencies
- Full code obfuscation in production builds (javascript-obfuscator + terser)
- Complete file name anonymization ([hash].js format, no [name])
- XOR + Base64 obfuscation for localStorage metadata protection
- Service Worker-based dynamic manifest delivery
- Multiple disguise modules: Game 2048, Calculator, Notepad
- Geotagged photo capture with precision overlays
- Mobile-optimized interface with Radix UI components

## Project Structure
```
.
├── client/                       # React frontend PWA
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.html
│   │   ├── lib/
│   │   │   ├── obfuscation.ts   # XOR + Base64 obfuscation utilities
│   │   │   ├── privacy-context.tsx
│   │   │   ├── pwa.ts           # PWA installation logic
│   │   ├── privacy_modules/
│   │   │   └── registry.ts      # Module manifest configuration
│   ├── public/
│   │   ├── sw.js               # Service Worker (dynamic manifest generation)
│   │   ├── favicon.svg          # Camroid M icon
│   │   ├── game-icon.svg        # Game 2048 disguise icon
│   │   ├── calculator-icon.svg  # Calculator disguise icon
│   │   ├── notepad-icon.svg     # Notepad disguise icon
│   ├── index.html              # Entry point with dynamic metadata
│   ├── vite.config.ts          # Vite config with obfuscator plugin
├── server/                      # Express.js backend (TypeScript)
│   └── index.ts
├── server-go/                   # Go backend server
│   └── main.go                 # Full-featured Go server with config management
├── vite-obfuscator-plugin.ts   # Custom Vite plugin for code obfuscation
├── Caddyfile                   # Caddy reverse proxy configuration
├── nginx.conf                  # Nginx reverse proxy configuration
├── netlify.toml                # Netlify deployment configuration
├── package.json                # Node.js dependencies
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

## Recent Changes (Dec 19, 2025)

### Dynamic Manifest Update System
- Enhanced Service Worker with detailed logging for debugging
- Added Cache-Control headers (no-cache, no-store, must-revalidate) to prevent manifest caching
- Implemented storage event listener in HTML to update metadata when app-mode changes
- Dynamic icon and title updates based on selected privacy module

### Reverse Proxy Configuration
- Created Caddyfile with automatic HTTPS, security headers, and intelligent caching
- Created nginx.conf with SSL/TLS, gzip compression, and proper cache control
- Both configs handle:
  - Manifest.json: no caching (always fresh)
  - Service Worker: no caching (always fresh)
  - HTML: no caching
  - Assets with hash: aggressive caching (31536000s = 1 year)
  - API requests: no caching
  - Images: moderate caching (86400s = 1 day)

## Current Implementation Details

### Obfuscation Strategy
**Development:** No obfuscation (fast builds, readable code for debugging)
**Production:** Full obfuscation applied via:
1. Custom Vite plugin using javascript-obfuscator
2. Terser minification for further compression
3. File names use [hash].js format only (no [name] component)

### Dynamic Manifest Generation
**Mechanism:** Go backend generates manifest dynamically via `/manifest.json` endpoint
**Data Source:** Server-side AppConfig (privacy mode + selected module)
**Update Flow:**
1. User selects privacy module in settings
2. Frontend sends config to `POST /api/config`
3. Go server updates internal AppConfig (thread-safe with RWMutex)
4. Browser requests `/manifest.json` (no caching: Cache-Control: no-cache)
5. Go server generates fresh manifest with correct name/icons
6. Browser refreshes PWA metadata automatically

**Modules Configuration** (client/src/privacy_modules/registry.ts):
```typescript
- game-2048: name="Game 2048", icon="/game-icon.svg", description="Slide tiles..."
- calculator: name="Calculator", icon="/calculator-icon.svg", description="Simple calculator..."
- notepad: name="Notepad", icon="/notepad-icon.svg", description="Simple notepad..."
- default: name="Camroid M", icon="/favicon.svg" (when privacy disabled)
```

### Backend Architecture
**Express Server (server/index.ts):**
- Development server with Vite hot reload
- Content Security Policy with strict frame-ancestors
- Static file serving in production
- API routes registration

**Go Server (server-go/main.go) - Recommended for Production:**
- Version: 1.1.0
- **Dynamic PWA Manifest Generation:** `GET /manifest.json` returns JSON based on privacy mode + selected module
- Full configuration management via `GET/POST /api/config`
- ImgBB upload proxy with whitelist validation
- CORS & Origin validation
- Gzip compression with smart skip for binary formats
- Cache control middleware with intelligent headers
- Security middleware (HSTS, X-Frame-Options, XSS Protection, CSP)
- Health check endpoint: `/api/health`
- Production-ready performance optimizations

**Go Manifest Generation Details:**
```go
// Manifest reflects current server configuration:
- Privacy OFF → Shows "Camroid M" with /favicon.* icons
- Privacy ON + "game-2048" → Shows "Game 2048" with /game-icon.* icons
- Privacy ON + "calculator" → Shows "Calculator" with /calculator-icon.* icons
- Privacy ON + "notepad" → Shows "Notepad" with /notepad-icon.* icons

// Header control:
- Cache-Control: no-cache, no-store, must-revalidate
- Pragma: no-cache
- Expires: 0
```

**Go API Endpoints:**
- `GET /api/health` - Health check with version info
- `GET /api/config` - Retrieve application configuration
- `POST /api/config` - Update application configuration
- `POST /api/imgbb` - ImgBB image upload proxy
- `POST /api/proxy` - Generic HTTP proxy with whitelist

### Build Optimization
**Vite Configuration:**
- React plugin enabled
- Tailwind CSS with Vite integration
- Custom obfuscator plugin for production builds
- SPA routing via index.html fallback

**Netlify Deployment:**
- Build command: `npx vite build`
- Publish directory: `dist/public`
- Terser automatically installed via package.json
- Production build automatically applies full obfuscation

## User Preferences
- Privacy first: All metadata obfuscated, code fully minified in production
- Performance: Development builds skip obfuscation for instant feedback
- Security: XOR encryption for localStorage, Content Security Policy headers
- Modern stack: React 18, TypeScript, Tailwind CSS, Radix UI

## Deployment Options

### Option 1: Netlify (Recommended)
- Automatic HTTPS via Let's Encrypt
- Static hosting with serverless functions support
- Zero configuration required for obfuscation (Terser in package.json)
- Deploy: `git push` to connected repository

### Option 2: Self-Hosted with Caddy
```bash
# Install Caddy, then:
caddy run --config Caddyfile

# Run Go backend in background:
cd server-go && go run main.go &

# Or build binary:
cd server-go && go build -o camroid-server && ./camroid-server
```

**Caddyfile Features:**
- Automatic HTTPS with Let's Encrypt
- Header injection for security & caching
- Reverse proxy to Go backend (localhost:5000)
- JSON access logging
- Zero-config deployment

### Option 3: Self-Hosted with Nginx
```bash
# Copy nginx.conf to /etc/nginx/nginx.conf
# Update server_name and SSL paths
# Install SSL certificates (Let's Encrypt recommended)

sudo certbot certonly --standalone -d example.com

# Update nginx.conf with certificate paths:
# ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

# Test and reload:
sudo nginx -t
sudo systemctl restart nginx

# Run Go backend:
cd server-go && go run main.go
```

**nginx.conf Features:**
- TLSv1.2+ with modern ciphers
- HSTS with preload
- Gzip compression (excludes binary formats)
- Load balancing support (up to 3 backends configured)
- Proper cache headers per content type
- WebSocket support for API
- Automatic HTTP to HTTPS redirect

## Testing Checklist

### Local Development
```bash
npm install
npm run dev
# Visit http://localhost:5173
# Service Worker and dynamic manifest work in dev
```

### Production Build
```bash
npm run build
# Verify:
# - dist/public/index.html (no [name] in assets)
# - Check obfuscation in dist/public/assets/*.js
# - Manifest remains unobfuscated and under /public
```

### PWA Installation (Android Chrome)
1. Open app in Chrome
2. Tap "Install app" banner
3. Verify name shows selected privacy module (Game 2048, etc.)
4. Verify correct icon displayed
5. Clear site data: DevTools → Application → Clear site data
6. Reopen to test fresh install

### Manifest Update Test
1. Enable Privacy Mode in Settings
2. Select "Game 2048" module
3. Uninstall app from device
4. Reinstall - should now show "Game 2048" name and icon
5. Note: May require Service Worker cache clearing on some browsers

### Netlify Deployment
- Build logs show Terser being applied
- Production assets have obfuscated names ([hash].js)
- Manifest.json remains readable JSON (critical for PWA)
- Network tab shows no-cache headers on manifest.json

## Known Issues & Workarounds

### Issue: Dynamic manifest not updating on Android Chrome
**Status:** FIXED ✅ (Manifest now generated by Go backend)
- Manifest is no longer cached at any layer (Cache-Control: no-cache, no-store, must-revalidate)
- Each request to `/manifest.json` returns fresh data from server
- Server-side AppConfig is thread-safe (RWMutex) - no race conditions
- Browser PWA metadata updates immediately when you modify `/api/config`

### Issue: Terser not found on Netlify
**Status:** FIXED ✅ (Terser added to package.json dependencies)
- Netlify automatically runs `npm install` before build
- Terser is now guaranteed to be installed

### Issue: File names still show [name] in production
**Status:** FIXED ✅ (vite.config.ts updated to use [hash] only)
- Vite rollupOptions.output configuration uses '[hash].js' format
- Custom obfuscator plugin does not modify file names

## Build & Deployment Scripts

### Quick Setup
```bash
bash setup.sh              # Verify all tools installed
./build.sh --setup --go    # Full setup + production build
```

### Build Options
```bash
./build.sh                                    # Dev build (Node.js)
./build.sh --go                               # Production build (Go)
./build.sh --go --clean --obfuscate           # Full production (Go + obfuscation)
```

See **INSTALL.md** for complete build documentation and deployment options.

## Next Steps (Optional)
- [ ] Implement manifest versioning query parameter
- [ ] Add analytics (privacy-respecting)
- [ ] Implement app auto-update via Service Worker
- [ ] Add support for custom unlock gestures/patterns
- [ ] Expand disguise modules (more app options)
- [ ] Implement end-to-end encryption for captured photos

## Architecture Decisions

1. **Service Worker for Dynamic Manifest:** Chosen because it requires no backend involvement and works completely client-side. The manifest must be dynamically generated on each request to reflect the user's current privacy settings.

2. **XOR + Base64 Obfuscation for localStorage:** Chosen for lightweight metadata protection without heavy cryptography. localStorage access is synchronous in Service Worker context.

3. **Vite Custom Plugin for Code Obfuscation:** Chosen to automatically obfuscate all JavaScript during production builds without manual configuration. Terser provides final minification.

4. **[hash].js File Format:** Chosen for complete file name anonymization. Tools analyzing the build cannot identify component names from file names.

5. **Dual Server Architecture (Express + Go):** Express for development with hot reload, Go for production with better performance and configuration management. Go server not required for Netlify deployment (static hosting).

## Security Considerations

✅ **Implemented:**
- Content Security Policy (strict, no inline scripts except data attributes)
- XSS protection headers (X-XSS-Protection, X-Frame-Options)
- CORS properly configured
- Service Worker cache isolation
- localStorage data obfuscation (XOR + Base64)
- Code obfuscation in production
- File name anonymization
- HTTPS enforcement (via Caddyfile/nginx.conf)
- Permission policy restricting camera access

⚠️ **In Scope for User:**
- Never expose localStorage obfuscation key in code review
- Keep Go server's /api/config endpoint secured if exposed
- Configure proper SSL certificates before production
- Monitor access logs for suspicious patterns
- Regular security updates for dependencies

## License & Attribution
Built with React, TypeScript, Tailwind CSS, Radix UI, Vite, and javascript-obfuscator.
