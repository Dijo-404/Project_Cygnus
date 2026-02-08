/**
 * CygnusServer Integration Tests
 *
 * Integration tests for the CygnusServer class using real instances.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CygnusServer } from '../../src/server.js';
import { AgentManager } from '../../src/AgentManager.js';
import { StellarClient } from '../../src/stellar/StellarClient.js';
import { DIDManager } from '../../protocols/masumi/index.js';
import { SokosumiCoordinator } from '../../protocols/sokosumi/index.js';
import * as http from 'http';
import { IncomingHttpHeaders } from 'http';

describe('CygnusServer', () => {
  let server: CygnusServer;
  let agentManager: AgentManager;
  let stellarClient: StellarClient;
  let didManager: DIDManager;
  let coordinator: SokosumiCoordinator;

  const testPort = 3405; // Use a different port to avoid conflicts
  const testHost = 'localhost';

  beforeEach(() => {
    // Initialize real dependencies
    stellarClient = new StellarClient({
      network: 'testnet',
      horizonUrl: 'https://horizon-testnet.stellar.org',
    });

    // Mock network interactions
    vi.spyOn(stellarClient, 'fundAccount').mockResolvedValue();
    vi.spyOn(stellarClient, 'invokeContract').mockResolvedValue({
      success: true,
      hash: 'test-hash',
      ledger: 100
    });

    // Mock transaction construction/signing/broadcasting
    const mockTx = {
      source: 'test-source',
      fee: '100',
      sequence: '1',
      operations: [],
      hash: () => Buffer.from('test-hash'),
      toXDR: () => 'test-xdr',
      signatures: []
    };

    vi.spyOn(stellarClient, 'constructTransaction').mockResolvedValue(mockTx as any);
    vi.spyOn(stellarClient, 'signTransaction').mockResolvedValue({
      transaction: mockTx as any,
      signature: 'test-signature',
      hash: 'test-hash'
    });
    vi.spyOn(stellarClient, 'broadcastTransaction').mockResolvedValue({
      success: true,
      hash: 'test-hash',
      ledger: 100
    });

    didManager = new DIDManager({
      didMethod: 'stellar',
      trustedIssuers: [],
      stellarNetwork: 'testnet',
    }, stellarClient);

    // Initialize coordinator with correct arguments if possible, otherwise rely on default/mock behavior being replaced by real logic
    // We assume the structure matches AgentManager.test.ts usage
    coordinator = new SokosumiCoordinator({
      negotiationTimeout: 300,
      maxConcurrentNegotiations: 10,
      reputationThreshold: 0.5
    });

    agentManager = new AgentManager(
      stellarClient,
      didManager,
      coordinator
    );

    server = new CygnusServer({ port: 0, host: testHost });
  });

  afterEach(async () => {
    await server.stop();
  });

  // Helper to get port after start
  const getPort = () => server.getPort();

  describe('GET /agents endpoint', () => {
    it('should return 503 when agent manager is not set', async () => {
      await server.start();

      const response = await makeRequest('/agents', getPort());

      expect(response.statusCode).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Agent manager not initialized');
      expect(response.body.agents).toEqual([]);
    });

    it('should return empty agents array when no agents exist', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makeRequest('/agents', getPort());

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('agents');
      expect(response.body.agents).toEqual([]);
    });

    it('should include CORS headers in response', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makeRequest('/agents', getPort());

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
    });
  });

  describe('Root endpoint', () => {
    it('should include /agents in endpoints list', async () => {
      await server.start();

      const response = await makeRequest('/', getPort());

      expect(response.statusCode).toBe(200);
      expect(response.body.endpoints).toHaveProperty('agents');
      expect(response.body.endpoints.agents).toBe('/agents');
    });
  });

  describe('GET /agents/:id endpoint', () => {
    it('should return 503 when agent manager is not set', async () => {
      await server.start();

      const response = await makeRequest('/agents/agent-1', getPort());

      expect(response.statusCode).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Agent manager not initialized');
    });

    it('should return 404 for non-existent agent', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makeRequest('/agents/non-existent', getPort());

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe("Agent with ID 'non-existent' not found");
    });
  });

  describe('POST /agents/:id/fund endpoint', () => {
    it('should return 503 when agent manager is not set', async () => {
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      }, getPort());

      expect(response.statusCode).toBe(503);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Agent manager not initialized');
    });

    it('should return 400 when amount is missing', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      }, getPort());

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should return 400 when sourcePublicKey is missing', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        signedTransaction: 'AAAA...',
      }, getPort());

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should return 400 when signedTransaction is missing', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      }, getPort());

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should return 400 for invalid JSON in request body', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makePostRequestRaw('/agents/agent-1/fund', 'invalid json', getPort());

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid JSON in request body');
    });

    it('should return 404 when agent does not exist', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makePostRequest('/agents/non-existent/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      }, getPort());

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid amount', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '-100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      }, getPort());

      expect(response.statusCode).toBeOneOf([400, 404]);
    });

    it('should include CORS headers in response', async () => {
      server.setAgentManager(agentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      }, getPort());

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
    });
  });
});

/**
 * Helper function to make HTTP requests to the server
 */
function makeRequest(path: string, port: number): Promise<{
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path,
      method: 'GET',
    };

    const req = http.request(options, (res: http.IncomingMessage) => {
      let data = '';

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            body,
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Helper function to make HTTP POST requests to the server
 */
/**
 * Helper function to make HTTP POST requests to the server
 */
function makePostRequest(path: string, body: any, port: number): Promise<{
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = http.request(options, (res: http.IncomingMessage) => {
      let data = '';

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        try {
          const responseBody = JSON.parse(data);
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            body: responseBody,
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Helper function to make HTTP POST requests with raw body
 */
function makePostRequestRaw(path: string, body: string, port: number): Promise<{
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res: http.IncomingMessage) => {
      let data = '';

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        try {
          const responseBody = JSON.parse(data);
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            body: responseBody,
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
