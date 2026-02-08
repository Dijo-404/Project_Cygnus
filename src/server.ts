/**
 * Project Cygnus Server
 * 
 * HTTP server for health checks, metrics, and API endpoints.
 */

import * as http from 'http';
import { PrometheusExporter } from './monitoring/PrometheusExporter.js';
import { MetricsCollector } from './monitoring/MetricsCollector.js';
import { AgentManager } from './AgentManager.js';

export interface ServerConfig {
  port: number;
  host: string;
}

/**
 * HTTP Server for Project Cygnus
 */
export class CygnusServer {
  private server: http.Server | null = null;
  private config: ServerConfig;
  private metricsCollector: MetricsCollector;
  private prometheusExporter: PrometheusExporter;
  private agentManager: AgentManager | null = null;

  constructor(config: ServerConfig) {
    this.config = config;
    this.metricsCollector = new MetricsCollector();
    this.prometheusExporter = new PrometheusExporter(this.metricsCollector);
  }

  /**
   * Set the agent manager
   */
  setAgentManager(agentManager: AgentManager): void {
    this.agentManager = agentManager;
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error) => {
        console.error('[Server] Error:', error);
        reject(error);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`[Server] Listening on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log('[Server] Stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || '/';

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route handling
    if (url === '/health') {
      this.handleHealth(req, res);
    } else if (url === '/metrics') {
      this.handleMetrics(req, res);
    } else if (url === '/status') {
      this.handleStatus(req, res);
    } else if (url === '/agents') {
      this.handleAgents(req, res);
    } else if (url.startsWith('/agents/')) {
      // Extract agent ID and action from URL path
      const pathParts = url.substring('/agents/'.length).split('/');
      const agentId = pathParts[0];
      const action = pathParts[1];
      
      if (action === 'fund' && req.method === 'POST') {
        this.handleFundAgent(agentId, req, res);
      } else if (!action) {
        this.handleAgentById(agentId, req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } else if (url === '/') {
      this.handleRoot(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Health check endpoint
   */
  private handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }));
  }

  /**
   * Metrics endpoint (Prometheus format)
   */
  private handleMetrics(_req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(this.prometheusExporter.export());
  }

  /**
   * Status endpoint
   */
  private handleStatus(_req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Project Cygnus',
      version: '0.7.0',
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Root endpoint
   */
  private handleRoot(_req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Project Cygnus',
      version: '0.7.0',
      description: 'Machine Economy Stack - Autonomous Agentic Ecosystem',
      endpoints: {
        health: '/health',
        metrics: '/metrics',
        status: '/status',
        agents: '/agents',
      },
    }));
  }

  /**
   * Agents endpoint - returns list of all agents
   */
  private handleAgents(_req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.agentManager) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Agent manager not initialized',
        agents: []
      }));
      return;
    }

    try {
      const agentStatuses = this.agentManager.getAllAgentStatuses();
      
      // Format response according to design spec
      const agents = agentStatuses.map(status => ({
        id: status.id,
        did: status.did,
        name: status.name,
        status: status.status,
        balance: status.balance,
        activeLoans: status.activeLoans,
        activeEscrows: status.activeEscrows,
        uptime: status.uptime,
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ agents }));
    } catch (error) {
      console.error('[Server] Error handling /agents request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        agents: []
      }));
    }
  }

  /**
   * Agent by ID endpoint - returns detailed information for a specific agent
   */
  private handleAgentById(agentId: string, _req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.agentManager) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Agent manager not initialized'
      }));
      return;
    }

    try {
      const agentStatus = this.agentManager.getAgentStatus(agentId);
      
      if (!agentStatus) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: `Agent with ID '${agentId}' not found`
        }));
        return;
      }

      // Return full agent status with all fields from design spec
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(agentStatus));
    } catch (error) {
      console.error(`[Server] Error handling /agents/${agentId} request:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error'
      }));
    }
  }

  /**
   * Fund agent endpoint - POST /agents/:id/fund
   */
  private handleFundAgent(agentId: string, req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.agentManager) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Agent manager not initialized'
      }));
      return;
    }

    // Store reference to avoid null check issues in async callback
    const agentManager = this.agentManager;

    // Parse request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Parse JSON body
        const params = JSON.parse(body);

        // Validate required fields
        if (!params.amount || !params.sourcePublicKey || !params.signedTransaction) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Missing required parameters: amount, sourcePublicKey, and signedTransaction are required'
          }));
          return;
        }

        // Call AgentManager.fundAgent
        const result = await agentManager.fundAgent(agentId, {
          amount: params.amount,
          sourcePublicKey: params.sourcePublicKey,
          signedTransaction: params.signedTransaction,
        });

        // Return appropriate status code based on result
        if (result.success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          // Determine status code based on error message
          let statusCode = 500;
          if (result.error?.includes('not found')) {
            statusCode = 404;
          } else if (result.error?.includes('required') || result.error?.includes('Invalid')) {
            statusCode = 400;
          }

          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (error) {
        console.error(`[Server] Error handling POST /agents/${agentId}/fund:`, error);

        // Handle JSON parse errors
        if (error instanceof SyntaxError) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body'
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }));
        }
      }
    });

    req.on('error', (error) => {
      console.error(`[Server] Request error for POST /agents/${agentId}/fund:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Request processing error'
      }));
    });
  }


  /**
   * Get metrics collector
   */
  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }
}
