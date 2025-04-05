// src/lib/policy-types.ts

export enum PolicyOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  EQUAL_TO = '=',
  NOT_EQUAL_TO = '!=',
}

export enum PolicyTarget {
  ORDER_TOTAL = 'orderTotal',
  ORDER_QUANTITY = 'orderQuantity',
  PRODUCT_SKU = 'productSku',
  WALLET_BALANCE = 'walletBalance',
  TIME_OF_DAY = 'timeOfDay',
}

export interface FlagPolicy {
  id: string;
  name: string;
  description?: string;
  target: PolicyTarget;
  operator: PolicyOperator;
  value: number | string;
  enabled: boolean;
  createdAt: string;
}

export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  triggered: boolean;
  reason?: string;
}

export interface PolicyCheckResult {
  requiresApproval: boolean;
  evaluations: PolicyEvaluation[];
}
