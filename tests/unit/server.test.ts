/**
 * CygnusServer Tests
 * 
 * Unit tests for the CygnusServer class.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CygnusServer } from '../../src/server.js';
import { AgentManager } from '../../src/AgentManager.js';
import * as http from 'http';

describe('CygnusServer', () => {
  let server: CygnusServer;
  const testPort = 3402;
  const testHost = 'localhost';

  beforeEach(() => {
    server = new CygnusServer({ port: testPort, host: testHost });
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('GET /agents endpoint', () => {
    it('should return 503 when agent manager is not set', async () => {
      await server.start();

      const response = await makeRequest('/agents');
      
      expect(response.statusCode).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Agent manager not initialized');
      expect(response.body.agents).toEqual([]);
    });

    it('should return empty agents array when no agents exist', async () => {
      // Create mock agent manager
      const mockAgentManager = {
        getAllAgentStatuses: vi.fn().mockReturnValue([]),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('agents');
      expect(response.body.agents).toEqual([]);
      expect(mockAgentManager.getAllAgentStatuses).toHaveBeenCalled();
    });

    it('should return agent list with correct format', async () => {
      const mockAgentStatuses = [
        {
          id: 'agent-1',
          did: 'did:stellar:testnet:agent1',
          name: 'Test Agent 1',
          status: 'running' as const,
          balance: '1000.0000000',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          activeLoans: 2,
          activeEscrows: 1,
          spending: {
            today: '50.0000000',
            thisWeek: '200.0000000',
            limits: {
              maxSingleTransaction: '100.0000000',
              dailyLimit: '500.0000000',
              weeklyLimit: '2000.0000000',
            },
          },
          uptime: 3600,
          lastActivity: Date.now(),
        },
        {
          id: 'agent-2',
          did: 'did:stellar:testnet:agent2',
          name: 'Test Agent 2',
          status: 'stopped' as const,
          balance: '500.0000000',
          publicKey: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            today: '0',
            thisWeek: '0',
            limits: {
              maxSingleTransaction: '100.0000000',
              dailyLimit: '500.0000000',
              weeklyLimit: '2000.0000000',
            },
          },
          uptime: 0,
          lastActivity: Date.now(),
        },
      ];

      const mockAgentManager = {
        getAllAgentStatuses: vi.fn().mockReturnValue(mockAgentStatuses),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('agents');
      expect(response.body.agents).toHaveLength(2);
      
      // Verify first agent
      expect(response.body.agents[0]).toEqual({
        id: 'agent-1',
        did: 'did:stellar:testnet:agent1',
        name: 'Test Agent 1',
        status: 'running',
        balance: '1000.0000000',
        activeLoans: 2,
        activeEscrows: 1,
        uptime: 3600,
      });

      // Verify second agent
      expect(response.body.agents[1]).toEqual({
        id: 'agent-2',
        did: 'did:stellar:testnet:agent2',
        name: 'Test Agent 2',
        status: 'stopped',
        balance: '500.0000000',
        activeLoans: 0,
        activeEscrows: 0,
        uptime: 0,
      });
    });

    it('should handle errors from agent manager gracefully', async () => {
      const mockAgentManager = {
        getAllAgentStatuses: vi.fn().mockImplementation(() => {
          throw new Error('Agent manager error');
        }),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.agents).toEqual([]);
    });

    it('should include CORS headers in response', async () => {
      const mockAgentManager = {
        getAllAgentStatuses: vi.fn().mockReturnValue([]),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents');
      
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
    });
  });

  describe('Root endpoint', () => {
    it('should include /agents in endpoints list', async () => {
      await server.start();

      const response = await makeRequest('/');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.endpoints).toHaveProperty('agents');
      expect(response.body.endpoints.agents).toBe('/agents');
    });
  });

  describe('GET /agents/:id endpoint', () => {
    it('should return 503 when agent manager is not set', async () => {
      await server.start();

      const response = await makeRequest('/agents/agent-1');
      
      expect(response.statusCode).toBe(503);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Agent manager not initialized');
    });

    it('should return 404 for non-existent agent', async () => {
      const mockAgentManager = {
        getAgentStatus: vi.fn().mockReturnValue(null),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents/non-existent');
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe("Agent with ID 'non-existent' not found");
      expect(mockAgentManager.getAgentStatus).toHaveBeenCalledWith('non-existent');
    });

    it('should return detailed agent status for valid agent ID', async () => {
      const mockAgentStatus = {
        id: 'agent-1',
        did: 'did:stellar:testnet:agent1',
        name: 'Test Agent 1',
        status: 'running' as const,
        balance: '1000.0000000',
        publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        activeLoans: 2,
        activeEscrows: 1,
        spending: {
          today: '50.0000000',
          thisWeek: '200.0000000',
          limits: {
            maxSingleTransaction: '100.0000000',
            dailyLimit: '500.0000000',
            weeklyLimit: '2000.0000000',
          },
        },
        uptime: 3600,
        lastActivity: 1234567890,
      };

      const mockAgentManager = {
        getAgentStatus: vi.fn().mockReturnValue(mockAgentStatus),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents/agent-1');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockAgentStatus);
      expect(mockAgentManager.getAgentStatus).toHaveBeenCalledWith('agent-1');
    });

    it('should return all required fields in agent status', async () => {
      const mockAgentStatus = {
        id: 'agent-1',
        did: 'did:stellar:testnet:agent1',
        name: 'Test Agent 1',
        status: 'running' as const,
        balance: '1000.0000000',
        publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        activeLoans: 2,
        activeEscrows: 1,
        spending: {
          today: '50.0000000',
          thisWeek: '200.0000000',
          limits: {
            maxSingleTransaction: '100.0000000',
            dailyLimit: '500.0000000',
            weeklyLimit: '2000.0000000',
          },
        },
        uptime: 3600,
        lastActivity: 1234567890,
      };

      const mockAgentManager = {
        getAgentStatus: vi.fn().mockReturnValue(mockAgentStatus),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents/agent-1');
      
      expect(response.statusCode).toBe(200);
      
      // Verify all required fields are present
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('did');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('publicKey');
      expect(response.body).toHaveProperty('activeLoans');
      expect(response.body).toHaveProperty('activeEscrows');
      expect(response.body).toHaveProperty('spending');
      expect(response.body.spending).toHaveProperty('today');
      expect(response.body.spending).toHaveProperty('thisWeek');
      expect(response.body.spending).toHaveProperty('limits');
      expect(response.body.spending.limits).toHaveProperty('maxSingleTransaction');
      expect(response.body.spending.limits).toHaveProperty('dailyLimit');
      expect(response.body.spending.limits).toHaveProperty('weeklyLimit');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('lastActivity');
    });

    it('should handle errors from agent manager gracefully', async () => {
      const mockAgentManager = {
        getAgentStatus: vi.fn().mockImplementation(() => {
          throw new Error('Agent manager error');
        }),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents/agent-1');
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Internal server error');
    });

    it('should include CORS headers in response', async () => {
      const mockAgentStatus = {
        id: 'agent-1',
        did: 'did:stellar:testnet:agent1',
        name: 'Test Agent 1',
        status: 'running' as const,
        balance: '1000.0000000',
        publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        activeLoans: 2,
        activeEscrows: 1,
        spending: {
          today: '50.0000000',
          thisWeek: '200.0000000',
          limits: {
            maxSingleTransaction: '100.0000000',
            dailyLimit: '500.0000000',
            weeklyLimit: '2000.0000000',
          },
        },
        uptime: 3600,
        lastActivity: 1234567890,
      };

      const mockAgentManager = {
        getAgentStatus: vi.fn().mockReturnValue(mockAgentStatus),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents/agent-1');
      
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
    });

    it('should handle agent IDs with special characters', async () => {
      const mockAgentManager = {
        getAgentStatus: vi.fn().mockReturnValue(null),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makeRequest('/agents/agent-with-dashes-123');
      
      expect(response.statusCode).toBe(404);
      expect(mockAgentManager.getAgentStatus).toHaveBeenCalledWith('agent-with-dashes-123');
    });
  });
});

/**
 * Helper function to make HTTP requests to the server
 */
function makeRequest(path: string): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3402,
      path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
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

  describe('POST /agents/:id/fund endpoint', () => {
    it('should return 503 when agent manager is not set', async () => {
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.statusCode).toBe(503);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Agent manager not initialized');
    });

    it('should return 400 when amount is missing', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn(),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameters');
      expect(mockAgentManager.fundAgent).not.toHaveBeenCalled();
    });

    it('should return 400 when sourcePublicKey is missing', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn(),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameters');
      expect(mockAgentManager.fundAgent).not.toHaveBeenCalled();
    });

    it('should return 400 when signedTransaction is missing', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn(),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameters');
      expect(mockAgentManager.fundAgent).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid JSON in request body', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn(),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequestRaw('/agents/agent-1/fund', 'invalid json');
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid JSON in request body');
      expect(mockAgentManager.fundAgent).not.toHaveBeenCalled();
    });

    it('should return 404 when agent does not exist', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn().mockResolvedValue({
          success: false,
          error: "Agent with ID 'non-existent' not found",
        }),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/non-existent/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
      expect(mockAgentManager.fundAgent).toHaveBeenCalledWith('non-existent', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
    });

    it('should return 200 and transaction result on successful funding', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn().mockResolvedValue({
          success: true,
          transactionHash: 'abc123def456',
          newBalance: '1100.0000000',
        }),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transactionHash', 'abc123def456');
      expect(response.body).toHaveProperty('newBalance', '1100.0000000');
      expect(mockAgentManager.fundAgent).toHaveBeenCalledWith('agent-1', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
    });

    it('should return 400 for invalid amount', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid amount: must be a positive number',
        }),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '-100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid');
    });

    it('should return 500 for internal server errors', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn().mockResolvedValue({
          success: false,
          error: 'Transaction submission failed',
        }),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should include CORS headers in response', async () => {
      const mockAgentManager = {
        fundAgent: vi.fn().mockResolvedValue({
          success: true,
          transactionHash: 'abc123def456',
          newBalance: '1100.0000000',
        }),
      } as unknown as AgentManager;

      server.setAgentManager(mockAgentManager);
      await server.start();

      const response = await makePostRequest('/agents/agent-1/fund', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });
      
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
    });
  });
});

/**
 * Helper function to make HTTP POST requests to the server
 */
function makePostRequest(path: string, body: any): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3402,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
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
function makePostRequestRaw(path: string, body: string): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3402,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
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
