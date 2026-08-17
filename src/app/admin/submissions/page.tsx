import { AdminSubmissionsQueue } from "@/components/admin/AdminSubmissionsQueue";

export default function AdminSubmissionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">
        Pending video submissions. Only submissions linked to an existing place can be approved.
      </p>
      <AdminSubmissionsQueue />
    </div>
  );
}
