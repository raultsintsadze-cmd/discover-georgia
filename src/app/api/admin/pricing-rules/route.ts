import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { pricingService } from "@/lib/services/impl/PricingService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const createSchema = z.object({
  pricePerKm: z.number().min(0),
  dailyDriverRate: z.number().min(0),
  minimumTripPrice: z.number().min(0),
  fuelRate: z.number().min(0),
  additionalFees: z.array(z.object({ label: z.string().trim().min(1), amount: z.number().min(0) })),
});

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const rules = await pricingService.listRuleHistory();
  return jsonOk(rules);
}

/** Creates a new rule and makes it the active one — see PricingService.setActiveRule. */
export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidPricingRule"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const rule = await pricingService.setActiveRule(session.user.id, parsed.data);
  return jsonOk(rule, { status: 201 });
}
