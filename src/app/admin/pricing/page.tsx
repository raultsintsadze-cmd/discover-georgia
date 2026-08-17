import { pricingService } from "@/lib/services/impl/PricingService";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AdminPricingForm } from "@/components/admin/AdminPricingForm";

export default async function AdminPricingPage() {
  const rules = await pricingService.listRuleHistory();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="mb-2 text-h3 text-ink-900">New rule</p>
        <Card>
          <CardContent className="pt-4">
            <AdminPricingForm />
          </CardContent>
        </Card>
      </section>

      <section>
        <p className="mb-2 text-h3 text-ink-900">History</p>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-body-sm font-medium text-ink-900">
                    {r.pricePerKm} GEL/km · {r.dailyDriverRate} GEL/day
                  </p>
                  {r.isActive && <Badge variant="success">Active</Badge>}
                </div>
                <p className="text-caption text-ink-500">
                  Min {r.minimumTripPrice} GEL · Fuel {r.fuelRate} GEL/km · Effective{" "}
                  {new Date(r.effectiveFrom).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
