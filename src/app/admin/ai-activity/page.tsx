import { AdminAiActivityList } from "@/components/admin/AdminAiActivityList";

export default function AdminAiActivityPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">
        Recent AI Travel Agent conversations, including the full tool-call audit trail — the record that proves an
        answer came from a real tool call, not free-text generation.
      </p>
      <AdminAiActivityList />
    </div>
  );
}
