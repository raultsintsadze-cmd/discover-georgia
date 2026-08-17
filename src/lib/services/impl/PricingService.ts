import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import type { Money } from "@/lib/types/domain";
import type {
  PricingService,
  PricingRuleDTO,
  PricingRuleInput,
  TransportCostInput,
  TransportCostEstimate,
} from "../pricing.service";

export interface TransportRates {
  pricePerKm: number;
  dailyDriverRate: number;
  minimumTripPrice: number;
  fuelRate: number;
  additionalFees: { label: string; amount: number }[];
}

function toMoney(gel: number): Money {
  // Money.amount is integer tetri (GEL minor unit) — see src/lib/types/domain.ts.
  return { amount: Math.round(gel * 100), currency: "GEL" };
}

/**
 * The one place the transport-cost formula lives. Used both for the
 * platform's default "ESTIMATED PRICE" (via the active PricingRule) and
 * for each driver's own card price (via that driver's own rates) — see
 * DriverService — so the two never drift apart.
 *
 * total is floored at minimumTripPrice; the component breakdown reflects
 * the raw calculation even when the floor applies (the total, not the
 * parts, is what the floor overrides — standard "minimum fare" behavior).
 */
export function computeTransportCost(
  rates: TransportRates,
  distanceMeters: number,
  tripDays: number
): TransportCostEstimate {
  const distanceKm = distanceMeters / 1000;
  const distanceCostGel = distanceKm * rates.pricePerKm;
  const driverCostGel = tripDays * rates.dailyDriverRate;
  const fuelCostGel = distanceKm * rates.fuelRate;
  const additionalFeesGel = rates.additionalFees.reduce((sum, f) => sum + f.amount, 0);
  const totalGel = Math.max(distanceCostGel + driverCostGel + fuelCostGel + additionalFeesGel, rates.minimumTripPrice);

  return {
    distanceCost: toMoney(distanceCostGel),
    driverCost: toMoney(driverCostGel),
    fuelEstimate: toMoney(fuelCostGel),
    additionalFees: toMoney(additionalFeesGel),
    total: toMoney(totalGel),
  };
}

function toDTO(rule: {
  id: string;
  pricePerKm: Prisma.Decimal;
  dailyDriverRate: Prisma.Decimal;
  minimumTripPrice: Prisma.Decimal;
  fuelRate: Prisma.Decimal;
  additionalFees: Prisma.JsonValue;
  isActive: boolean;
  effectiveFrom: Date;
}): PricingRuleDTO {
  return {
    id: rule.id,
    pricePerKm: rule.pricePerKm.toNumber(),
    dailyDriverRate: rule.dailyDriverRate.toNumber(),
    minimumTripPrice: rule.minimumTripPrice.toNumber(),
    fuelRate: rule.fuelRate.toNumber(),
    additionalFees: (rule.additionalFees as { label: string; amount: number }[] | null) ?? [],
    isActive: rule.isActive,
    effectiveFrom: rule.effectiveFrom,
  };
}

export class PrismaPricingService implements PricingService {
  async getActiveRule(): Promise<PricingRuleDTO> {
    const rule = await prisma.pricingRule.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: "desc" } });
    if (!rule) {
      throw new Error("No active pricing rule configured");
    }
    return toDTO(rule);
  }

  async listRuleHistory(): Promise<PricingRuleDTO[]> {
    const rules = await prisma.pricingRule.findMany({ orderBy: { effectiveFrom: "desc" } });
    return rules.map(toDTO);
  }

  async estimateTransportCost(input: TransportCostInput): Promise<TransportCostEstimate> {
    const rule = await this.getActiveRule();
    return computeTransportCost(rule, input.distanceMeters, input.tripDays);
  }

  async setActiveRule(adminUserId: string, rule: PricingRuleInput): Promise<PricingRuleDTO> {
    const created = await prisma.$transaction(async (tx) => {
      await tx.pricingRule.updateMany({ where: { isActive: true }, data: { isActive: false } });
      return tx.pricingRule.create({
        data: {
          name: `Set by admin ${adminUserId} on ${new Date().toISOString().slice(0, 10)}`,
          pricePerKm: rule.pricePerKm,
          dailyDriverRate: rule.dailyDriverRate,
          minimumTripPrice: rule.minimumTripPrice,
          fuelRate: rule.fuelRate,
          additionalFees: rule.additionalFees as unknown as Prisma.InputJsonValue,
          isActive: true,
        },
      });
    });
    return toDTO(created);
  }
}

export const pricingService: PricingService = new PrismaPricingService();
