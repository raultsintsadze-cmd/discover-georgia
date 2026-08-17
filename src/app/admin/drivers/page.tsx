import { AdminDriversList } from "@/components/admin/AdminDriversList";

export default function AdminDriversPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">Every driver, regardless of status. Verify or suspend from here.</p>
      <AdminDriversList />
    </div>
  );
}
