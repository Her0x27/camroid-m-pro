# 🚀 Setup Guide - Automated Installation

## One-Command Setup (Linux/macOS)

```bash
bash setup.sh
```

This script will:

### ✅ On Linux (Ubuntu/Debian):
1. Run `sudo apt-get update`
2. Install **Node.js** (LTS via NodeSource repo)
3. Install **Go** (via apt)
4. Install **build tools** (build-essential, git, curl)
5. Run `npm install` for all frontend dependencies
6. Verify everything works

### ✅ On macOS:
1. Check if Homebrew is installed
2. Install **Node.js** via Homebrew
3. Install **Go** via Homebrew
4. Run `npm install` for all dependencies
5. Verify setup

### ✅ What Gets Installed:
- ✓ Node.js (v18+)
- ✓ npm
- ✓ Go (v1.21+)
- ✓ Git
- ✓ build-essential (Linux)
- ✓ All npm packages (Vite, React, TypeScript, etc.)

---

## Usage

### First Time (Fresh System)
```bash
bash setup.sh
```

### After Setup - Build Project
```bash
./build.sh --go --clean --obfuscate
```

### Development Mode
```bash
npm run dev
```

---

## What If I Already Have Tools Installed?

The script checks before installing:
- If Node.js exists → skips installation
- If Go exists → skips installation  
- Always runs `npm install` to ensure dependencies are up-to-date

---

## Troubleshooting

### "sudo: apt-get: command not found"
You're not on Linux. The script auto-detects and uses Homebrew on macOS.

### "Homebrew not found" (macOS)
Install Homebrew first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### "Permission denied"
Make script executable:
```bash
chmod +x setup.sh build.sh
```

### Installation hangs at "sudo"
Your system needs your password. Enter it and wait.

---

## After Successful Setup

```
[✓] Node.js v20.x
[✓] npm 10.x
[✓] Go 1.24.4
[✓] Git installed
[✓] All npm packages installed
[✓] Build tools ready

Setup Complete! ✅

Next steps:
  ./build.sh              (build frontend + backend)
  ./build.sh --go         (build with Go server)
  npm run dev             (development mode)
```

