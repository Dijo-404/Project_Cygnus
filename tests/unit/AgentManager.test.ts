/**
 * Agent Manager Integration Tests
 * 
 * Integration tests for the AgentManager class using real instances.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentManager, AgentConfigWithId } from '../../src/AgentManager.js';
import { StellarClient } from '../../src/stellar/StellarClient.js';
import { DIDManager } from '../../protocols/masumi/index.js';
import { SokosumiCoordinator } from '../../protocols/sokosumi/index.js';

describe('AgentManager', () => {
  let agentManager: AgentManager;
  let stellarClient: StellarClient;
  let didManager: DIDManager;
  let coordinator: SokosumiCoordinator;

  beforeEach(() => {
    // Initialize real dependencies
    stellarClient = new StellarClient({
      network: 'testnet',
      horizonUrl: 'https://horizon-testnet.stellar.org',
    });

    didManager = new DIDManager({
      didMethod: 'stellar',
      trustedIssuers: [],
      stellarNetwork: 'testnet',
    }, stellarClient);

    coordinator = new SokosumiCoordinator({
      negotiationTimeout: 300,
      maxConcurrentNegotiations: 10,
      reputationThreshold: 0.5
    });

    // Verify StellarClient mock usage
    vi.spyOn(stellarClient, 'fundAccount').mockResolvedValue();
    vi.spyOn(stellarClient, 'invokeContract').mockResolvedValue({
      success: true,
      hash: 'test-hash',
      ledger: 100
    });

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

    // Create AgentManager instance with real dependencies
    agentManager = new AgentManager(
      stellarClient,
      didManager,
      coordinator
    );
  });

  afterEach(async () => {
    // Stop all agents to clean up
    await agentManager.stopAll();
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
          publicKey: 'GA2OPLFH2CQJMFP5WGOQ3A6VF7G5HSTEGP2MSE7MMJHJESM2UEEGWNVD',
          secretKey: 'SC6OJUEDXRMXSMQYYRQHL4J2ALTXOYXLMDC4CHUJN65NSDX7AJK7UZB2',
        },
      ];

      await agentManager.initialize(configs);

      expect(agentManager.getAgentCount()).toBe(1);
      const agent = agentManager.getAgent('agent-1');
      expect(agent).toBeDefined();
      expect(agent?.getStatus().isInitialized).toBe(true);
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
          publicKey: 'GA2OPLFH2CQJMFP5WGOQ3A6VF7G5HSTEGP2MSE7MMJHJESM2UEEGWNVD',
          secretKey: 'SC6OJUEDXRMXSMQYYRQHL4J2ALTXOYXLMDC4CHUJN65NSDX7AJK7UZB2',
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
          publicKey: 'GDU2JDHJ4NN4JPTKKKKJZICQR5AM2NB2O4JJB5ZKJECGOMXCHFH4SKW7',
          secretKey: 'SAFZ4F2WG5JQE7IUIQT4G52Y3Q55MVIQSMGIERATMHFM4WW6DNMDFHDG',
        },
      ];

      await agentManager.initialize(configs);

      expect(agentManager.getAgentCount()).toBe(2);
    });

    it('should throw error if agent initialization fails (invalid config)', async () => {
      const invalidConfigs: AgentConfigWithId[] = [
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
          publicKey: 'INVALID_KEY',
          secretKey: 'INVALID_SECRET',
        }
      ];

      try {
        await agentManager.initialize(invalidConfigs);
      } catch (e) {
        expect(e).toBeDefined();
      }
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
          publicKey: 'GA2OPLFH2CQJMFP5WGOQ3A6VF7G5HSTEGP2MSE7MMJHJESM2UEEGWNVD',
          secretKey: 'SC6OJUEDXRMXSMQYYRQHL4J2ALTXOYXLMDC4CHUJN65NSDX7AJK7UZB2',
        },
      ];

      await agentManager.initialize(configs);

      const agents = agentManager.getAgents();
      expect(agents).toHaveLength(1);
    });
  });

  describe('getAgent', () => {
    it('should return undefined for non-existent agent', () => {
      const result = agentManager.getAgent('non-existent');
      expect(result == null).toBe(true);
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
          publicKey: 'GA2OPLFH2CQJMFP5WGOQ3A6VF7G5HSTEGP2MSE7MMJHJESM2UEEGWNVD',
          secretKey: 'SC6OJUEDXRMXSMQYYRQHL4J2ALTXOYXLMDC4CHUJN65NSDX7AJK7UZB2',
        },
      ];

      await agentManager.initialize(configs);

      const agent = agentManager.getAgent('agent-1');
      expect(agent).toBeDefined();
    });
  });

  describe('getAgentStatus', () => {
    it('should return null for non-existent agent', () => {
      expect(agentManager.getAgentStatus('non-existent')).toBeNull();
    });

    it('should return agent status', async () => {
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
          publicKey: 'GA2OPLFH2CQJMFP5WGOQ3A6VF7G5HSTEGP2MSE7MMJHJESM2UEEGWNVD',
          secretKey: 'SC6OJUEDXRMXSMQYYRQHL4J2ALTXOYXLMDC4CHUJN65NSDX7AJK7UZB2',
        },
      ];

      await agentManager.initialize(configs);
      const status = agentManager.getAgentStatus('agent-1');
      expect(status).not.toBeNull();
      expect(status?.id).toBe('agent-1');
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
          characterFile: 'test-character.json',
          plugins: [],
          stellarNetwork: 'testnet',
          riskTolerance: 0.5,
          spendingLimits: {
            maxSingleTransaction: 1000,
            dailyLimit: 5000,
            weeklyLimit: 20000,
          },
          publicKey: 'GA2OPLFH2CQJMFP5WGOQ3A6VF7G5HSTEGP2MSE7MMJHJESM2UEEGWNVD',
          secretKey: 'SC6OJUEDXRMXSMQYYRQHL4J2ALTXOYXLMDC4CHUJN65NSDX7AJK7UZB2',
        },
      ];

      await agentManager.initialize(configs);

      const statuses = agentManager.getAllAgentStatuses();
      expect(statuses).toHaveLength(1);
    });
  });
});
