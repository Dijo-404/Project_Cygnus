/**
 * Agent Manager
 * 
 * Manages multiple autonomous agent instances with registry and status tracking.
 */

import { AutonomousAgent } from '../agents/AutonomousAgent.js';
import { StellarClient } from './stellar/StellarClient.js';
import { DIDManager } from '../protocols/masumi/index.js';
import { SokosumiCoordinator } from '../protocols/sokosumi/index.js';
import type { AgentConfig } from '../agents/runtime/types.js';

/**
 * Agent configuration with ID
 */
export interface AgentConfigWithId extends AgentConfig {
  id: string;
  name: string;
}

/**
 * Agent status information
 */
export interface AgentStatus {
  id: string;
  did: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  balance: string;
  publicKey: string;
  activeLoans: number;
  activeEscrows: number;
  spending: {
    today: string;
    thisWeek: string;
    limits: {
      maxSingleTransaction: string;
      dailyLimit: string;
      weeklyLimit: string;
    };
  };
  uptime: number;
  lastActivity: number;
}

/**
 * Fund agent parameters
 */
export interface FundAgentParams {
  amount: string;
  sourcePublicKey: string;
  signedTransaction: string;
}

/**
 * Fund agent result
 */
export interface FundAgentResult {
  success: boolean;
  transactionHash?: string;
  newBalance?: string;
  error?: string;
}


/**
 * Agent Manager - manages multiple agent instances
 */
export class AgentManager {
  private agents: Map<string, AutonomousAgent>;
  private agentConfigs: Map<string, AgentConfigWithId>;
  private agentStartTimes: Map<string, number>;
  private stellarClient: StellarClient;
  private didManager: DIDManager;
  private coordinator: SokosumiCoordinator;

  constructor(
    stellarClient: StellarClient,
    didManager: DIDManager,
    coordinator: SokosumiCoordinator
  ) {
    this.agents = new Map();
    this.agentConfigs = new Map();
    this.agentStartTimes = new Map();
    this.stellarClient = stellarClient;
    this.didManager = didManager;
    this.coordinator = coordinator;
  }

  /**
   * Initialize agents from configuration
   */
  async initialize(configs: AgentConfigWithId[]): Promise<void> {
    for (const config of configs) {
      try {
        // Store configuration
        this.agentConfigs.set(config.id, config);

        // Create agent instance
        const agent = new AutonomousAgent(
          config,
          this.stellarClient,
          this.didManager,
          this.coordinator
        );

        // Initialize agent
        await agent.initialize();

        // Store agent
        this.agents.set(config.id, agent);
        this.agentStartTimes.set(config.id, Date.now());

        console.log(`[AgentManager] Initialized agent: ${config.id} (${config.name})`);
      } catch (error) {
        console.error(`[AgentManager] Failed to initialize agent ${config.id}:`, error);
        throw error;
      }
    }
  }

  /**
   * Get all agents
   */
  getAgents(): AutonomousAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get specific agent by ID
   */
  getAgent(id: string): AutonomousAgent | null {
    return this.agents.get(id) || null;
  }

  /**
   * Get agent status by ID
   */
  getAgentStatus(id: string): AgentStatus | null {
    const agent = this.agents.get(id);
    const config = this.agentConfigs.get(id);
    const startTime = this.agentStartTimes.get(id);

    if (!agent || !config) {
      return null;
    }

    try {
      const status = agent.getStatus();
      const uptime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      return {
        id,
        did: status.did || '',
        name: config.name,
        status: status.isRunning ? 'running' : 'stopped',
        balance: '0', // Would query from Stellar in production
        publicKey: config.publicKey || '',
        activeLoans: status.activeLoans,
        activeEscrows: status.activeEscrows,
        spending: {
          today: status.spending.daily.spent.toString(),
          thisWeek: status.spending.weekly.spent.toString(),
          limits: {
            maxSingleTransaction: config.spendingLimits.maxSingleTransaction.toString(),
            dailyLimit: config.spendingLimits.dailyLimit.toString(),
            weeklyLimit: config.spendingLimits.weeklyLimit.toString(),
          },
        },
        uptime,
        lastActivity: Date.now(),
      };
    } catch (error) {
      console.error(`[AgentManager] Error getting status for agent ${id}:`, error);
      return {
        id,
        did: '',
        name: config.name,
        status: 'error',
        balance: '0',
        publicKey: config.publicKey || '',
        activeLoans: 0,
        activeEscrows: 0,
        spending: {
          today: '0',
          thisWeek: '0',
          limits: {
            maxSingleTransaction: config.spendingLimits.maxSingleTransaction.toString(),
            dailyLimit: config.spendingLimits.dailyLimit.toString(),
            weeklyLimit: config.spendingLimits.weeklyLimit.toString(),
          },
        },
        uptime: 0,
        lastActivity: Date.now(),
      };
    }
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): AgentStatus[] {
    const statuses: AgentStatus[] = [];
    
    for (const id of this.agents.keys()) {
      const status = this.getAgentStatus(id);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Start an agent
   */
  async startAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    await agent.start();
    this.agentStartTimes.set(id, Date.now());
    console.log(`[AgentManager] Started agent: ${id}`);
  }

  /**
   * Stop an agent
   */
  async stopAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    await agent.stop();
    console.log(`[AgentManager] Stopped agent: ${id}`);
  }

  /**
   * Stop all agents
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.agents.keys()).map(id => this.stopAgent(id));
    await Promise.all(stopPromises);
    console.log('[AgentManager] Stopped all agents');
  }

  /**
   * Check if an agent exists
   */
  hasAgent(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Fund an agent with XLM from a user wallet
   */
  async fundAgent(id: string, params: FundAgentParams): Promise<FundAgentResult> {
    const agent = this.agents.get(id);
    
    if (!agent) {
      return {
        success: false,
        error: `Agent with ID '${id}' not found`,
      };
    }

    try {
      // Validate parameters
      if (!params.amount || !params.sourcePublicKey || !params.signedTransaction) {
        return {
          success: false,
          error: 'Missing required parameters: amount, sourcePublicKey, and signedTransaction are required',
        };
      }

      // Validate amount is a positive number
      const amountNum = parseFloat(params.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return {
          success: false,
          error: 'Invalid amount: must be a positive number',
        };
      }

      // In a real implementation, we would:
      // 1. Verify the signed transaction
      // 2. Submit it to the Stellar network
      // 3. Wait for confirmation
      // 4. Update the agent's balance
      
      // For now, we'll simulate a successful transaction
      // TODO: Implement actual Stellar transaction submission
      const transactionHash = `simulated_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Simulate getting the new balance
      // In production, this would query the Stellar network
      const currentBalance = parseFloat(await this.getAgentBalance(id));
      const newBalance = (currentBalance + amountNum).toFixed(7);

      console.log(`[AgentManager] Funded agent ${id} with ${params.amount} XLM from ${params.sourcePublicKey}`);
      console.log(`[AgentManager] Transaction hash: ${transactionHash}`);
      console.log(`[AgentManager] New balance: ${newBalance} XLM`);

      return {
        success: true,
        transactionHash,
        newBalance,
      };
    } catch (error) {
      console.error(`[AgentManager] Error funding agent ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get agent balance from Stellar network
   * @private
   */
  private async getAgentBalance(id: string): Promise<string> {
    // In production, this would query the Stellar network
    // For now, return a simulated balance
    return '100.0000000';
  }
}

