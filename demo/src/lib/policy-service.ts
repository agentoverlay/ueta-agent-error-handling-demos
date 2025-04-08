// src/lib/policy-service.ts

import { FlagPolicy, PolicyOperator, PolicyTarget, PolicyEvaluation, PolicyCheckResult } from './policy-types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the policy file
const POLICY_FILE = path.join(__dirname, '../data/policies.json');

export class PolicyService {
  // Load policies from file
  static loadPolicies(): FlagPolicy[] {
    try {
      if (!fs.existsSync(POLICY_FILE)) {
        return [];
      }
      
      const policyData = fs.readFileSync(POLICY_FILE, 'utf8');
      return JSON.parse(policyData);
    } catch (error) {
      console.error('Error loading policies:', error);
      return [];
    }
  }

  // Save policies to file
  static savePolicies(policies: FlagPolicy[]): boolean {
    try {
      // Make sure the directory exists
      const dir = path.dirname(POLICY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(POLICY_FILE, JSON.stringify(policies, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving policies:', error);
      return false;
    }
  }

  // Add a new policy
  static addPolicy(policy: Omit<FlagPolicy, 'id' | 'createdAt'>): FlagPolicy {
    const policies = this.loadPolicies();
    
    const newPolicy: FlagPolicy = {
      ...policy,
      id: `policy-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    policies.push(newPolicy);
    this.savePolicies(policies);
    
    return newPolicy;
  }

  // Update an existing policy
  static updatePolicy(id: string, updates: Partial<Omit<FlagPolicy, 'id' | 'createdAt'>>): FlagPolicy | null {
    const policies = this.loadPolicies();
    const policyIndex = policies.findIndex(p => p.id === id);
    
    if (policyIndex === -1) {
      return null;
    }
    
    policies[policyIndex] = {
      ...policies[policyIndex],
      ...updates,
    };
    
    this.savePolicies(policies);
    return policies[policyIndex];
  }

  // Delete a policy
  static deletePolicy(id: string): boolean {
    const policies = this.loadPolicies();
    const initialLength = policies.length;
    
    const filteredPolicies = policies.filter(p => p.id !== id);
    
    if (filteredPolicies.length === initialLength) {
      return false;
    }
    
    this.savePolicies(filteredPolicies);
    return true;
  }

  // Check if an order requires approval based on policies
  static checkPolicies(orderData: {
    sku: string;
    quantity: number;
    totalPrice: number;
    walletBalance: number;
    isAgentTransaction?: boolean;
  }): PolicyCheckResult {
    const policies = this.loadPolicies();
    const enabledPolicies = policies.filter(p => p.enabled);
    
    // Log if this is an agent transaction
    const isAgentTransaction = orderData.isAgentTransaction === true;
    console.log(`[Policy Check] Is agent transaction: ${isAgentTransaction}`);
    
    console.log(`[Policy Check] Checking order: SKU=${orderData.sku}, quantity=${orderData.quantity}, totalPrice=${orderData.totalPrice}, walletBalance=${orderData.walletBalance}`);
    console.log(`[Policy Check] Found ${enabledPolicies.length} enabled policies:`, enabledPolicies);
    
    if (enabledPolicies.length === 0) {
      console.log('[Policy Check] No enabled policies found, approval not required');
      return {
        requiresApproval: false,
        evaluations: []
      };
    }
    
    const now = new Date();
    const timeOfDay = now.getHours() * 100 + now.getMinutes(); // Format: 1430 for 2:30pm
    
    const evaluations: PolicyEvaluation[] = enabledPolicies.map(policy => {
      let triggered = false;
      let reason = '';
      
      // If this is a seller policy and we're not checking agent transactions, skip
      if (policy.policyType === 'seller' && !isAgentTransaction) {
        console.log(`[Policy Check] Skipping seller policy for non-agent transaction: ${policy.name}`);
        return {
          policyId: policy.id,
          policyName: policy.name,
          triggered: false,
          reason: undefined
        };
      }
      
      // If this is an agent policy and we're checking agent transactions, apply
      // If there's no policyType specified, treat as a universal policy
      switch (policy.target) {
        case PolicyTarget.AGENT_TRANSACTION:
          // This will trigger only for agent transactions
          triggered = isAgentTransaction === Boolean(policy.value);
          reason = triggered ? `Agent transaction detected` : '';
          break;
          
        case PolicyTarget.ORDER_TOTAL:
          triggered = this.evaluateCondition(orderData.totalPrice, policy.operator, Number(policy.value));
          reason = triggered ? `Order total (${orderData.totalPrice}) ${policy.operator} ${policy.value}` : '';
          break;
          
        case PolicyTarget.ORDER_QUANTITY:
          triggered = this.evaluateCondition(orderData.quantity, policy.operator, Number(policy.value));
          reason = triggered ? `Order quantity (${orderData.quantity}) ${policy.operator} ${policy.value}` : '';
          break;
          
        case PolicyTarget.PRODUCT_SKU:
          triggered = this.evaluateCondition(orderData.sku, policy.operator, String(policy.value));
          reason = triggered ? `Product SKU (${orderData.sku}) ${policy.operator} ${policy.value}` : '';
          break;
          
        case PolicyTarget.WALLET_BALANCE:
          triggered = this.evaluateCondition(orderData.walletBalance, policy.operator, Number(policy.value));
          reason = triggered ? `Wallet balance (${orderData.walletBalance}) ${policy.operator} ${policy.value}` : '';
          break;
          
        case PolicyTarget.TIME_OF_DAY:
          triggered = this.evaluateCondition(timeOfDay, policy.operator, Number(policy.value));
          reason = triggered ? `Time of day (${Math.floor(timeOfDay/100)}:${(timeOfDay%100).toString().padStart(2,'0')}) ${policy.operator} ${Math.floor(Number(policy.value)/100)}:${(Number(policy.value)%100).toString().padStart(2,'0')}` : '';
          break;
      }
      
      return {
        policyId: policy.id,
        policyName: policy.name,
        triggered,
        reason: triggered ? reason : undefined
      };
    });
    
    // Check if any policy was triggered
    const requiresApproval = evaluations.some(e => e.triggered);
    
    console.log('[Policy Check] Evaluation results:', evaluations);
    console.log(`[Policy Check] Requires approval: ${requiresApproval}`);
    
    return {
      requiresApproval,
      evaluations
    };
  }

  // Helper method to evaluate conditions
  private static evaluateCondition(
    actual: number | string,
    operator: PolicyOperator,
    expected: number | string
  ): boolean {
    switch (operator) {
      case PolicyOperator.GREATER_THAN:
        return Number(actual) > Number(expected);
      
      case PolicyOperator.LESS_THAN:
        return Number(actual) < Number(expected);
      
      case PolicyOperator.EQUAL_TO:
        return String(actual) === String(expected);
      
      case PolicyOperator.NOT_EQUAL_TO:
        return String(actual) !== String(expected);
      
      default:
        return false;
    }
  }
}
