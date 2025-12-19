#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print colored output
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1${BLUE}  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Main setup
main() {
    print_header "Camroid M - Development Setup"
    
    print_step "Checking system requirements..."
    
    # Check OS
    OS_TYPE=$(uname -s)
    if [[ "$OS_TYPE" != "Linux" && "$OS_TYPE" != "Darwin" ]]; then
        print_error "Unsupported OS: $OS_TYPE (Linux/macOS required)"
        exit 1
    fi
    print_success "OS: $OS_TYPE"
    
    # Check if running on Replit
    if [ -n "$REPLIT_OWNER" ]; then
        print_success "Running on Replit"
    fi
    
    echo ""
    print_step "Checking installed tools..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION"
    else
        print_error "Node.js is not installed"
        echo "  Install from: https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION"
    else
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Go
    if command -v go &> /dev/null; then
        GO_VERSION=$(go version | awk '{print $3}')
        print_success "Go $GO_VERSION"
    else
        print_error "Go is not installed"
        echo "  Install from: https://golang.org/dl/"
        exit 1
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        print_success "Git installed"
    else
        print_error "Git is not installed (optional but recommended)"
    fi
    
    echo ""
    print_step "Setting up project structure..."
    
    # Create necessary directories
    mkdir -p client/dist
    mkdir -p server/dist
    mkdir -p server-go
    print_success "Directories created"
    
    echo ""
    print_step "Installing frontend dependencies..."
    
    # Install npm dependencies
    if npm install; then
        print_success "Frontend dependencies installed"
    else
        print_error "Failed to install npm dependencies"
        exit 1
    fi
    
    echo ""
    print_step "Verifying build tools..."
    
    # Check key dependencies
    if npm list vite &> /dev/null; then
        print_success "Vite found"
    else
        print_error "Vite not found"
        exit 1
    fi
    
    if npm list @vitejs/plugin-react &> /dev/null; then
        print_success "Vite React plugin found"
    else
        print_error "Vite React plugin not found"
        exit 1
    fi
    
    if npm list typescript &> /dev/null; then
        print_success "TypeScript found"
    else
        print_error "TypeScript not found"
        exit 1
    fi
    
    if npm list javascript-obfuscator &> /dev/null; then
        print_success "JavaScript Obfuscator found"
    else
        print_error "JavaScript Obfuscator not found"
        exit 1
    fi
    
    if npm list terser &> /dev/null; then
        print_success "Terser found"
    else
        print_error "Terser not found"
        exit 1
    fi
    
    echo ""
    print_step "Checking Go environment..."
    
    # Check Go workspace
    GOPATH=$(go env GOPATH)
    print_success "GOPATH: $GOPATH"
    
    # Check Go modules
    if [ -f "server-go/go.mod" ]; then
        print_success "Go module found: server-go/go.mod"
    else
        print_error "Go module not found"
        exit 1
    fi
    
    echo ""
    print_header "Setup Complete!"
    
    echo "Next steps:"
    echo ""
    echo "1. Build frontend and backend:"
    echo "   ${CYAN}./build.sh${NC}              (Node.js server)"
    echo "   ${CYAN}./build.sh --go${NC}         (Go server)"
    echo "   ${CYAN}./build.sh --go --obfuscate${NC} (Go + obfuscation)"
    echo ""
    echo "2. Development mode:"
    echo "   ${CYAN}npm run dev${NC}            (Start dev server on :5173)"
    echo ""
    echo "3. Run production server:"
    echo "   ${CYAN}cd server-go && go run main.go${NC}"
    echo "   or"
    echo "   ${CYAN}cd server-go && ./camroid-server${NC} (after building)"
    echo ""
    echo "4. Deploy:"
    echo "   - Netlify: ${CYAN}git push${NC} (auto-deploy on webhook)"
    echo "   - Self-hosted: Use ${CYAN}Caddyfile${NC} or ${CYAN}nginx.conf${NC}"
    echo ""
}

main "$@"
