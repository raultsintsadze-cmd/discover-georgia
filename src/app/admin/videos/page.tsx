import { AdminVideosList } from "@/components/admin/AdminVideosList";

export default function AdminVideosPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">Published videos across every place. Pick which one shows as each place&apos;s featured video.</p>
      <AdminVideosList />
    </div>
  );
}
