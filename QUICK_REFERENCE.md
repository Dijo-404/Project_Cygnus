# Project Cygnus - Quick Reference

A quick reference guide for common tasks and commands.

## Table of Contents

- [Installation](#installation)
- [Development](#development)
- [Testing](#testing)
- [Building](#building)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)

## Installation

### Prerequisites

```bash
# Check versions
node --version    # Should be v20+
npm --version
cargo --version
stellar --version
```

### Quick Setup

```bash
# Clone and install
git clone https://github.com/yourusername/project-cygnus.git
cd project-cygnus
npm install
cd dashboard && npm install && cd ..

# Configure Stellar
stellar network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

stellar keys generate --global alice --network testnet
stellar keys fund alice --network testnet
```

## Development

### Start Backend

```bash
# Development mode
npm run dev

# Watch mode (auto-reload)
npm run dev:watch

# Start on specific network
npm run dev start testnet
npm run dev start mainnet

# Check status
npm run dev status
```

### Start Dashboard

```bash
cd dashboard

# Development (both frontend and backend)
./start.sh

# Or separately
npm run server  # Backend on port 3001
npm run dev     # Frontend on port 5173
```

### Code Quality

```bash
# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check

# Type check
npm run typecheck
```

## Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test suites
npm run test:unit
npm run test:integration
npm run test:property

# With UI
npm run test:ui

# Dashboard tests
cd dashboard && npm test
```

### Contract Tests

```bash
# All contracts
cd contracts && cargo test

# Specific contract
cd contracts/loan && cargo test
cd contracts/escrow && cargo test
cd contracts/credit-scoring && cargo test
```

## Building

### TypeScript Build

```bash
# Build
npm run build

# Clean build
npm run clean && npm run build
```

### Contract Build

```bash
# Build all contracts
cd contracts/loan && cargo build --release --target wasm32-unknown-unknown
cd contracts/escrow && cargo build --release --target wasm32-unknown-unknown
cd contracts/credit-scoring && cargo build --release --target wasm32-unknown-unknown
```

### Dashboard Build

```bash
cd dashboard

# Production build
npm run build

# Preview build
npm run preview
```

## Deployment

### Docker

```bash
# Build image
docker build -t project-cygnus .

# Run container
docker run -d -p 3402:3402 --name cygnus-agent project-cygnus

# Docker Compose
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### Kubernetes

```bash
# Deploy
kubectl apply -f k8s/

# Check status
kubectl get pods -n cygnus
kubectl get services -n cygnus

# View logs
kubectl logs -f deployment/cygnus-agent -n cygnus
```

### Systemd

```bash
# Install service
sudo cp cygnus-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload

# Manage service
sudo systemctl start cygnus-dashboard
sudo systemctl stop cygnus-dashboard
sudo systemctl restart cygnus-dashboard
sudo systemctl status cygnus-dashboard

# Enable on boot
sudo systemctl enable cygnus-dashboard
```

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3402/health

# Dashboard health
curl http://localhost:3001/health

# System status
curl http://localhost:3402/status
```

### Metrics

```bash
# Prometheus metrics
curl http://localhost:3402/metrics

# Dashboard metrics
curl http://localhost:3001/api/metrics
```

### Logs

```bash
# View logs
tail -f logs/combined.log
tail -f logs/error.log

# Docker logs
docker logs -f cygnus-agent

# Kubernetes logs
kubectl logs -f deployment/cygnus-agent -n cygnus
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process
lsof -i :3402
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3403 npm run dev
```

#### Build Failures

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Test Failures

```bash
# Clear test cache
npm test -- --clearCache

# Run specific test
npm test -- tests/unit/AgentManager.test.ts

# Debug mode
npm test -- --inspect-brk
```

#### Docker Issues

```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Reset Everything

```bash
# Nuclear option - reset everything
npm run clean
rm -rf node_modules package-lock.json dist
cd dashboard && rm -rf node_modules package-lock.json dist && cd ..
npm install
cd dashboard && npm install && cd ..
npm run build
```

## API Endpoints

### Backend (Port 3402)

```bash
# Health check
GET /health

# System status
GET /status

# Metrics
GET /metrics

# List agents
GET /agents

# Get agent details
GET /agents/:id

# Fund agent
POST /agents/:id/fund
Content-Type: application/json
{
  "amount": "100",
  "sourcePublicKey": "GABC...",
  "signedTransaction": "AAAAAgA..."
}
```

### Dashboard API (Port 3001)

```bash
# Health check
GET /health

# System status
GET /api/status

# Metrics
GET /api/metrics

# Logs
GET /api/logs

# Contracts
GET /api/contracts

# Build contracts
POST /api/build

# Run tests
POST /api/test

# Deploy
POST /api/deploy
```

## Environment Variables

### Backend (.env)

```env
# Server
PORT=3402
HOST=0.0.0.0
NODE_ENV=development

# Stellar
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Logging
LOG_LEVEL=info

# Contracts (optional)
CREDIT_SCORING_CONTRACT=
LOAN_CONTRACT=
ESCROW_CONTRACT=
```

### Dashboard (dashboard/.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Stellar
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Backend
BACKEND_URL=http://localhost:3402
```

## Git Workflow

### Branching

```bash
# Create feature branch
git checkout -b feature/my-feature

# Create fix branch
git checkout -b fix/my-fix

# Update from main
git fetch origin
git rebase origin/main
```

### Committing

```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update readme"

# Push
git push origin feature/my-feature
```

### Pull Requests

```bash
# Update branch
git fetch origin
git rebase origin/main

# Push changes
git push origin feature/my-feature --force-with-lease

# Create PR on GitHub
```

## Stellar CLI

### Network Management

```bash
# Add network
stellar network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# List networks
stellar network ls

# Remove network
stellar network rm testnet
```

### Key Management

```bash
# Generate keypair
stellar keys generate --global alice --network testnet

# Show public key
stellar keys address alice

# Fund account (testnet only)
stellar keys fund alice --network testnet

# List keys
stellar keys ls
```

### Contract Deployment

```bash
# Deploy contract
stellar contract deploy \
  --wasm contracts/loan/target/wasm32-unknown-unknown/release/loan.wasm \
  --source alice \
  --network testnet

# Invoke contract
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- \
  function_name \
  --arg1 value1
```

## Useful Commands

### File Operations

```bash
# Find files
find . -name "*.ts" -type f

# Search in files
grep -r "search term" src/

# Count lines of code
find src -name "*.ts" | xargs wc -l
```

### Process Management

```bash
# List processes
ps aux | grep node

# Kill process by name
pkill -f "node.*cli.ts"

# Monitor resources
top
htop
```

### Network

```bash
# Check port
netstat -tuln | grep 3402

# Test connection
curl -v http://localhost:3402/health

# Check DNS
nslookup horizon-testnet.stellar.org
```

## Keyboard Shortcuts (VS Code)

- `Ctrl+Shift+P` - Command palette
- `Ctrl+P` - Quick file open
- `Ctrl+Shift+F` - Search in files
- `F5` - Start debugging
- `Ctrl+` - Toggle terminal
- `Ctrl+Shift+` - New terminal

## Resources

- **Documentation**: [docs/](docs/)
- **GitHub**: [github.com/yourusername/project-cygnus](https://github.com/yourusername/project-cygnus)
- **Stellar Docs**: [developers.stellar.org](https://developers.stellar.org)
- **Soroban Docs**: [soroban.stellar.org](https://soroban.stellar.org)

---

**Need more help?** Check the full documentation in the [docs/](docs/) directory or open an issue on GitHub.
