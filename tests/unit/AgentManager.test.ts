/**
 * Agent Manager Tests
 * 
 * Unit tests for the AgentManager class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentManager, AgentConfigWithId } from '../../src/AgentManager.js';
import { AutonomousAgent } from '../../agents/AutonomousAgent.js';
import { StellarClient } from '../../src/stellar/StellarClient.js';
import { DIDManager } from '../../protocols/masumi/index.js';
import { SokosumiCoordinator } from '../../protocols/sokosumi/index.js';

// Mock dependencies
vi.mock('../../agents/AutonomousAgent.js');
vi.mock('../../src/stellar/StellarClient.js');
vi.mock('../../protocols/masumi/index.js');
vi.mock('../../protocols/sokosumi/index.js');

describe('AgentManager', () => {
  let agentManager: AgentManager;
  let mockStellarClient: StellarClient;
  let mockDIDManager: DIDManager;
  let mockCoordinator: SokosumiCoordinator;

  beforeEach(() => {
    // Create mock instances
    mockStellarClient = new StellarClient({
      network: 'testnet',
      horizonUrl: 'https://horizon-testnet.stellar.org',
    });

    mockDIDManager = new DIDManager({
      didMethod: 'stellar',
      trustedIssuers: [],
      stellarNetwork: 'testnet',
    }, mockStellarClient);

    mockCoordinator = new SokosumiCoordinator(
      { stellarNetwork: 'testnet', discoveryInterval: 60000 },
      mockStellarClient
    );

    // Create AgentManager instance
    agentManager = new AgentManager(
      mockStellarClient,
      mockDIDManager,
      mockCoordinator
    );
  });

  describe('initialization', () => {
    it('should initialize with empty agent registry', () => {
      expect(agentManager.getAgentCount()).toBe(0);
      expect(agentManager.getAgents()).toEqual([]);
    });

    it('should initialize agents from configuration', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1234567890',
          secretKey: 'STEST1234567890',
        },
      ];

      // Mock AutonomousAgent methods
      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1234567890',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            today: 0,
            thisWeek: 0,
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      expect(agentManager.getAgentCount()).toBe(1);
      expect(mockAgent.initialize).toHaveBeenCalled();
    });

    it('should initialize multiple agents', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character-1.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          characterFile: 'test-character-2.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.7,
          spendingLimits: {
            maxSingleTransaction: 2000,
            dailyLimit: 10000,
            weeklyLimit: 40000,
          },
          publicKey: 'GTEST2',
          secretKey: 'STEST2',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      expect(agentManager.getAgentCount()).toBe(2);
    });

    it('should throw error if agent initialization fails', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockRejectedValue(new Error('Initialization failed')),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await expect(agentManager.initialize(configs)).rejects.toThrow('Initialization failed');
    });
  });

  describe('getAgents', () => {
    it('should return empty array when no agents', () => {
      expect(agentManager.getAgents()).toEqual([]);
    });

    it('should return all agents', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      const agents = agentManager.getAgents();
      expect(agents).toHaveLength(1);
    });
  });

  describe('getAgent', () => {
    it('should return null for non-existent agent', () => {
      expect(agentManager.getAgent('non-existent')).toBeNull();
    });

    it('should return agent by ID', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      const agent = agentManager.getAgent('agent-1');
      expect(agent).not.toBeNull();
    });
  });

  describe('getAgentStatus', () => {
    it('should return null for non-existent agent', () => {
      expect(agentManager.getAgentStatus('non-existent')).toBeNull();
    });

    it('should return agent status with all required fields', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1234567890',
          secretKey: 'STEST1234567890',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1234567890',
          isInitialized: true,
          isRunning: true,
          balance: 100,
          activeLoans: 2,
          activeEscrows: 3,
          spending: {
            today: 500,
            thisWeek: 2000,
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      const status = agentManager.getAgentStatus('agent-1');

      expect(status).not.toBeNull();
      expect(status?.id).toBe('agent-1');
      expect(status?.did).toBe('did:stellar:testnet:GTEST1234567890');
      expect(status?.name).toBe('Test Agent 1');
      expect(status?.status).toBe('running');
      expect(status?.publicKey).toBe('GTEST1234567890');
      expect(status?.activeLoans).toBe(2);
      expect(status?.activeEscrows).toBe(3);
      expect(status?.spending.today).toBe('500');
      expect(status?.spending.thisWeek).toBe('2000');
      expect(status?.spending.limits.maxSingleTransaction).toBe('1000');
      expect(status?.spending.limits.dailyLimit).toBe('5000');
      expect(status?.spending.limits.weeklyLimit).toBe('20000');
      expect(status?.uptime).toBeGreaterThanOrEqual(0);
      expect(status?.lastActivity).toBeGreaterThan(0);
    });

    it('should return error status when agent.getStatus() throws', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockImplementation(() => {
          throw new Error('Status error');
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      const status = agentManager.getAgentStatus('agent-1');

      expect(status).not.toBeNull();
      expect(status?.status).toBe('error');
      expect(status?.activeLoans).toBe(0);
      expect(status?.activeEscrows).toBe(0);
    });
  });

  describe('getAllAgentStatuses', () => {
    it('should return empty array when no agents', () => {
      expect(agentManager.getAllAgentStatuses()).toEqual([]);
    });

    it('should return statuses for all agents', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character-1.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          characterFile: 'test-character-2.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.7,
          spendingLimits: {
            maxSingleTransaction: 2000,
            dailyLimit: 10000,
            weeklyLimit: 40000,
          },
          publicKey: 'GTEST2',
          secretKey: 'STEST2',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      const statuses = agentManager.getAllAgentStatuses();
      expect(statuses).toHaveLength(2);
    });
  });

  describe('hasAgent', () => {
    it('should return false for non-existent agent', () => {
      expect(agentManager.hasAgent('non-existent')).toBe(false);
    });

    it('should return true for existing agent', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      expect(agentManager.hasAgent('agent-1')).toBe(true);
    });
  });

  describe('getAgentCount', () => {
    it('should return 0 when no agents', () => {
      expect(agentManager.getAgentCount()).toBe(0);
    });

    it('should return correct count', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);

      expect(agentManager.getAgentCount()).toBe(1);
    });
  });

  describe('startAgent', () => {
    it('should throw error for non-existent agent', async () => {
      await expect(agentManager.startAgent('non-existent')).rejects.toThrow(
        'Agent non-existent not found'
      );
    });

    it('should start an agent', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        start: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1',
          isInitialized: true,
          isRunning: false,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);
      await agentManager.startAgent('agent-1');

      expect(mockAgent.start).toHaveBeenCalled();
    });
  });

  describe('stopAgent', () => {
    it('should throw error for non-existent agent', async () => {
      await expect(agentManager.stopAgent('non-existent')).rejects.toThrow(
        'Agent non-existent not found'
      );
    });

    it('should stop an agent', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);
      await agentManager.stopAgent('agent-1');

      expect(mockAgent.stop).toHaveBeenCalled();
    });
  });

  describe('stopAll', () => {
    it('should stop all agents', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          characterFile: 'test-character-1.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GTEST1',
          secretKey: 'STEST1',
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          characterFile: 'test-character-2.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.7,
          spendingLimits: {
            maxSingleTransaction: 2000,
            dailyLimit: 10000,
            weeklyLimit: 40000,
          },
          publicKey: 'GTEST2',
          secretKey: 'STEST2',
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:GTEST',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: { today: 0, thisWeek: 0 },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);

      await agentManager.initialize(configs);
      await agentManager.stopAll();

      expect(mockAgent.stop).toHaveBeenCalledTimes(2);
    });
  });

  describe('fundAgent', () => {
    it('should return error when agent does not exist', async () => {
      const result = await agentManager.fundAgent('non-existent', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error when amount is missing', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: '',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('should return error when sourcePublicKey is missing', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: '100',
        sourcePublicKey: '',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('should return error when signedTransaction is missing', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });

    it('should return error for invalid amount (negative)', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: '-100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });

    it('should return error for invalid amount (zero)', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: '0',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });

    it('should return error for invalid amount (not a number)', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: 'not-a-number',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });

    it('should return success with transaction hash and new balance for valid funding', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: '100',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBeDefined();
      expect(result.transactionHash).toMatch(/^simulated_tx_/);
      expect(result.newBalance).toBeDefined();
      expect(parseFloat(result.newBalance!)).toBeGreaterThan(0);
    });

    it('should calculate correct new balance after funding', async () => {
      const configs: AgentConfigWithId[] = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
          secretKey: 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
        },
      ];

      const mockAgent = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          did: 'did:stellar:testnet:agent1',
          isInitialized: true,
          isRunning: true,
          balance: 0,
          activeLoans: 0,
          activeEscrows: 0,
          spending: {
            daily: { spent: 0, limit: 5000, remaining: 5000, date: '2024-01-01' },
            weekly: { spent: 0, limit: 20000, remaining: 20000, weekStart: '2024-01-01' },
            singleTransaction: { limit: 1000 },
          },
        }),
      };

      vi.mocked(AutonomousAgent).mockImplementation(() => mockAgent as any);
      await agentManager.initialize(configs);

      const result = await agentManager.fundAgent('agent-1', {
        amount: '50.5',
        sourcePublicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        signedTransaction: 'AAAA...',
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe('150.5000000'); // 100 (simulated current) + 50.5
    });
  });
});
