import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(cors());
app.use(express.json());

// Mock data store
let systemStatus = {
  agents: { active: 3, total: 3 },
  contracts: { deployed: 3, total: 3 },
  channels: { active: 5, total: 10 },
  transactions: { count: 1247, rate: 12 },
};

let metrics = {
  settlement: [3200, 3400, 3100, 3300, 3500],
  latency: [45, 52, 48, 51, 47],
  errors: [2, 1, 3, 2, 1],
};

let logs = [
  { timestamp: new Date().toISOString().slice(11, 19), level: 'info', message: 'System initialized' },
  { timestamp: new Date().toISOString().slice(11, 19), level: 'info', message: 'Agents started successfully' },
  { timestamp: new Date().toISOString().slice(11, 19), level: 'info', message: 'Contracts deployed' },
];

let contracts = [
  { name: 'Credit Scoring', status: 'deployed', address: 'CXXX...XXXX', calls: 1523 },
  { name: 'Loan Management', status: 'deployed', address: 'LXXX...XXXX', calls: 892 },
  { name: 'Escrow', status: 'deployed', address: 'EXXX...XXXX', calls: 1247 },
];

let agents = [
  {
    id: 'agent-1',
    name: 'Trading Agent Alpha',
    did: 'did:stellar:GABC...WXYZ',
    address: 'GABC...WXYZ',
    status: 'running',
    balance: '1000.0000000',
    activeLoans: 2,
    activeEscrows: 1,
    uptime: 86400
  },
  {
    id: 'agent-2',
    name: 'Lending Agent Beta',
    did: 'did:stellar:GDEF...UVWX',
    address: 'GDEF...UVWX',
    status: 'running',
    balance: '500.0000000',
    activeLoans: 5,
    activeEscrows: 0,
    uptime: 43200
  },
  {
    id: 'agent-3',
    name: 'Risk Agent Gamma',
    did: 'did:stellar:GHIJ...RSTU',
    address: 'GHIJ...RSTU',
    status: 'idle',
    balance: '250.0000000',
    activeLoans: 0,
    activeEscrows: 3,
    uptime: 21600
  },
];

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/status', (_req, res) => {
  res.json(systemStatus);
});

app.get('/api/metrics', (_req, res) => {
  res.json(metrics);
});

app.get('/api/logs', (_req, res) => {
  res.json(logs);
});

app.get('/api/contracts', (_req, res) => {
  res.json(contracts);
});

app.get('/api/agents', (_req, res) => {
  res.json({ agents });
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

app.post('/api/agents/:id/fund', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const { amount } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  // Simulate funding
  const currentBalance = parseFloat(agent.balance);
  const fundAmount = parseFloat(amount);
  agent.balance = (currentBalance + fundAmount).toFixed(7);

  addLog('info', `Agent ${agent.id} funded with ${amount} XLM`);

  res.json({ success: true, newBalance: agent.balance });
});

app.post('/api/build', async (_req, res) => {
  try {
    addLog('info', 'Starting contract build...');

    const { stdout } = await execAsync('make build-contracts', {
      cwd: '..',
      timeout: 60000,
    });

    addLog('info', 'Contracts built successfully');
    res.json({ success: true, message: 'Contracts built successfully', output: stdout });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('error', `Build failed: ${errorMessage}`);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

app.post('/api/test', async (_req, res) => {
  try {
    addLog('info', 'Running tests...');

    const { stdout } = await execAsync('npm test', {
      cwd: '..',
      timeout: 120000,
    });

    addLog('info', 'Tests completed successfully');
    res.json({ success: true, message: 'All tests passed', output: stdout });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('error', `Tests failed: ${errorMessage}`);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

app.post('/api/deploy', async (req, res) => {
  const { target } = req.body;

  try {
    addLog('info', `Starting deployment to ${target}...`);

    let command;
    switch (target) {
      case 'testnet':
        command = 'make deploy-testnet';
        break;
      case 'docker':
        command = 'docker-compose up -d';
        break;
      case 'kubernetes':
        command = 'kubectl apply -f k8s/';
        break;
      default:
        throw new Error('Invalid deployment target');
    }

    const { stdout } = await execAsync(command, {
      cwd: '..',
      timeout: 180000,
    });

    addLog('info', `Deployment to ${target} completed successfully`);
    systemStatus.contracts.deployed = 3;

    res.json({ success: true, message: `Deployed to ${target} successfully`, output: stdout });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('error', `Deployment to ${target} failed: ${errorMessage}`);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Helper function to add logs
function addLog(level, message) {
  const log = {
    timestamp: new Date().toISOString().slice(11, 19),
    level,
    message,
  };
  logs.unshift(log);
  if (logs.length > 100) logs.pop();

  // Broadcast to WebSocket clients
  broadcastToClients({ type: 'log', payload: log });
}

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`[${NODE_ENV}] Dashboard server running on http://localhost:${PORT}`);
  console.log(`[${NODE_ENV}] Health check: http://localhost:${PORT}/health`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  // Send initial data
  ws.send(JSON.stringify({ type: 'status', payload: systemStatus }));
  ws.send(JSON.stringify({ type: 'metrics', payload: metrics }));

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

function broadcastToClients(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  });
}

// Simulate real-time updates
const metricsInterval = setInterval(() => {
  // Update metrics
  metrics.settlement.push(3000 + Math.random() * 2000);
  metrics.latency.push(40 + Math.random() * 30);
  metrics.errors.push(Math.floor(Math.random() * 5));

  if (metrics.settlement.length > 20) metrics.settlement.shift();
  if (metrics.latency.length > 20) metrics.latency.shift();
  if (metrics.errors.length > 20) metrics.errors.shift();

  // Update transaction count
  systemStatus.transactions.count += Math.floor(Math.random() * 5);
  systemStatus.transactions.rate = Math.floor(10 + Math.random() * 10);

  // Update contract calls
  contracts.forEach(contract => {
    contract.calls += Math.floor(Math.random() * 3);
  });

  // Broadcast updates
  broadcastToClients({ type: 'status', payload: systemStatus });
  broadcastToClients({ type: 'metrics', payload: metrics });
}, 3000);

// Simulate occasional logs
const logsInterval = setInterval(() => {
  const messages = [
    'Transaction processed successfully',
    'Agent evaluated opportunity',
    'Payment channel updated',
    'Credit score calculated',
    'Loan repayment received',
  ];

  const levels = ['info', 'info', 'info', 'warn', 'debug'];
  const randomIndex = Math.floor(Math.random() * messages.length);

  addLog(levels[randomIndex], messages[randomIndex]);
}, 8000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  clearInterval(metricsInterval);
  clearInterval(logsInterval);

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  clearInterval(metricsInterval);
  clearInterval(logsInterval);

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Dashboard backend initialized');
