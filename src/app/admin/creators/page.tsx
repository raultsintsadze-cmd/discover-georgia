import { AdminCreatorsQueue } from "@/components/admin/AdminCreatorsQueue";

export default function AdminCreatorsPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">Pending creator applications.</p>
      <AdminCreatorsQueue />
    </div>
  );
}
