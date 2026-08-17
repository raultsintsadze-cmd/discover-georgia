"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function AdminPricingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = React.useState({
    pricePerKm: "",
    dailyDriverRate: "",
    minimumTripPrice: "",
    fuelRate: "",
  });
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricePerKm: Number(values.pricePerKm),
          dailyDriverRate: Number(values.dailyDriverRate),
          minimumTripPrice: Number(values.minimumTripPrice),
          fuelRate: Number(values.fuelRate),
          additionalFees: [],
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't create rule", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "New pricing rule is now active", variant: "success" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price / km (GEL)" required>
          {(f) => (
            <Input
              {...f}
              type="number"
              min={0}
              step="0.01"
              value={values.pricePerKm}
              onChange={(e) => setValues((v) => ({ ...v, pricePerKm: e.target.value }))}
              required
            />
          )}
        </Field>
        <Field label="Daily driver rate (GEL)" required>
          {(f) => (
            <Input
              {...f}
              type="number"
              min={0}
              value={values.dailyDriverRate}
              onChange={(e) => setValues((v) => ({ ...v, dailyDriverRate: e.target.value }))}
              required
            />
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Minimum trip price (GEL)" required>
          {(f) => (
            <Input
              {...f}
              type="number"
              min={0}
              value={values.minimumTripPrice}
              onChange={(e) => setValues((v) => ({ ...v, minimumTripPrice: e.target.value }))}
              required
            />
          )}
        </Field>
        <Field label="Fuel rate (GEL/km)" required>
          {(f) => (
            <Input
              {...f}
              type="number"
              min={0}
              step="0.01"
              value={values.fuelRate}
              onChange={(e) => setValues((v) => ({ ...v, fuelRate: e.target.value }))}
              required
            />
          )}
        </Field>
      </div>
      <Button type="submit" loading={submitting} className="self-start">
        Make this the active rule
      </Button>
    </form>
  );
}
