import type { Money } from "@/lib/types/domain";

/**
 * The single place transport cost is computed, from admin-configured
 * PricingRule rows. Never hard-coded in the UI or computed by the AI.
 */
export interface PricingService {
  getActiveRule(): Promise<PricingRuleDTO>;
  /** Newest first — preserved for auditability of past estimates (see docs/database.md). */
  listRuleHistory(): Promise<PricingRuleDTO[]>;
  estimateTransportCost(input: TransportCostInput): Promise<TransportCostEstimate>;
  setActiveRule(adminUserId: string, rule: PricingRuleInput): Promise<PricingRuleDTO>;
}

export interface PricingRuleInput {
  pricePerKm: number;
  dailyDriverRate: number;
  minimumTripPrice: number;
  fuelRate: number;
  additionalFees: { label: string; amount: number }[];
}

export interface PricingRuleDTO extends PricingRuleInput {
  id: string;
  isActive: boolean;
  effectiveFrom: Date;
}

export interface TransportCostInput {
  distanceMeters: number;
  tripDays: number;
}

/** Always labeled ESTIMATED PRICE in the UI — see docs/ai-architecture.md. */
export interface TransportCostEstimate {
  distanceCost: Money;
  driverCost: Money;
  fuelEstimate: Money;
  additionalFees: Money;
  total: Money;
}
