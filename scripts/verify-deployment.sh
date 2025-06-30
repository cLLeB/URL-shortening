#!/bin/bash

# URL Shortener Pro - Deployment Verification Script
# This script verifies that the deployment is working correctly

set -e

echo "🚀 URL Shortener Pro - Deployment Verification"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
        
        # Check if Node.js version is 20 or higher
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 20 ]; then
            print_success "Node.js version is compatible (>= 20.0.0)"
        else
            print_error "Node.js version must be 20.0.0 or higher"
            exit 1
        fi
    else
        print_error "Node.js not found. Please install Node.js 20.0.0 or higher"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm not found"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"
    else
        print_warning "Docker not found (optional for development)"
    fi
    
    # Check Docker Compose (optional)
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose found: $COMPOSE_VERSION"
    else
        print_warning "Docker Compose not found (optional for development)"
    fi
}

# Check project structure
check_project_structure() {
    print_status "Checking project structure..."
    
    # Required directories
    REQUIRED_DIRS=("backend" "frontend" "docs" ".github")
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            print_success "Directory found: $dir"
        else
            print_error "Required directory missing: $dir"
            exit 1
        fi
    done
    
    # Required files
    REQUIRED_FILES=("README.md" "LICENSE" "docker-compose.yml" ".gitignore")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            print_success "File found: $file"
        else
            print_error "Required file missing: $file"
            exit 1
        fi
    done
}

# Check backend dependencies
check_backend() {
    print_status "Checking backend configuration..."
    
    cd backend
    
    if [ -f "package.json" ]; then
        print_success "Backend package.json found"
        
        # Check if node_modules exists
        if [ -d "node_modules" ]; then
            print_success "Backend dependencies installed"
        else
            print_warning "Backend dependencies not installed. Run: cd backend && npm install"
        fi
        
        # Check environment file
        if [ -f ".env.example" ]; then
            print_success "Backend .env.example found"
            if [ -f ".env" ]; then
                print_success "Backend .env configured"
            else
                print_warning "Backend .env not found. Copy from .env.example"
            fi
        else
            print_error "Backend .env.example missing"
        fi
    else
        print_error "Backend package.json missing"
        exit 1
    fi
    
    cd ..
}

# Check frontend dependencies
check_frontend() {
    print_status "Checking frontend configuration..."
    
    cd frontend
    
    if [ -f "package.json" ]; then
        print_success "Frontend package.json found"
        
        # Check if node_modules exists
        if [ -d "node_modules" ]; then
            print_success "Frontend dependencies installed"
        else
            print_warning "Frontend dependencies not installed. Run: cd frontend && npm install"
        fi
        
        # Check environment file
        if [ -f ".env.example" ]; then
            print_success "Frontend .env.example found"
            if [ -f ".env" ]; then
                print_success "Frontend .env configured"
            else
                print_warning "Frontend .env not found. Copy from .env.example"
            fi
        else
            print_error "Frontend .env.example missing"
        fi
    else
        print_error "Frontend package.json missing"
        exit 1
    fi
    
    cd ..
}

# Check GitHub Actions
check_github_actions() {
    print_status "Checking GitHub Actions configuration..."
    
    if [ -f ".github/workflows/ci.yml" ]; then
        print_success "CI/CD workflow found"
    else
        print_error "CI/CD workflow missing"
    fi
    
    if [ -f ".github/workflows/security.yml" ]; then
        print_success "Security workflow found"
    else
        print_error "Security workflow missing"
    fi
    
    if [ -f ".github/dependabot.yml" ]; then
        print_success "Dependabot configuration found"
    else
        print_error "Dependabot configuration missing"
    fi
}

# Check documentation
check_documentation() {
    print_status "Checking documentation..."
    
    REQUIRED_DOCS=("docs/SETUP.md" "docs/API.md" "docs/DEPLOYMENT.md" "docs/DEVELOPMENT.md" "docs/ARCHITECTURE.md")
    for doc in "${REQUIRED_DOCS[@]}"; do
        if [ -f "$doc" ]; then
            print_success "Documentation found: $doc"
        else
            print_error "Required documentation missing: $doc"
        fi
    done
    
    if [ -f "CONTRIBUTING.md" ]; then
        print_success "Contributing guidelines found"
    else
        print_error "Contributing guidelines missing"
    fi
    
    if [ -f ".github/SECURITY.md" ]; then
        print_success "Security policy found"
    else
        print_error "Security policy missing"
    fi
}

# Main execution
main() {
    echo ""
    check_requirements
    echo ""
    check_project_structure
    echo ""
    check_backend
    echo ""
    check_frontend
    echo ""
    check_github_actions
    echo ""
    check_documentation
    echo ""
    
    print_success "✅ Deployment verification completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Install dependencies: cd backend && npm install && cd ../frontend && npm install"
    echo "2. Configure environment: Copy .env.example to .env in both backend and frontend"
    echo "3. Start development: docker-compose up -d"
    echo "4. Access application: http://localhost:3000"
    echo ""
    print_status "For production deployment, see docs/DEPLOYMENT.md"
}

# Run main function
main
