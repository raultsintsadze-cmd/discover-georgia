import { prisma } from "@/lib/db/client";
import { Badge, type BadgeProps } from "@/components/ui/Badge";

const ROLE_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  USER: "neutral",
  CREATOR: "accent",
  DRIVER: "accent",
  ADMIN: "danger",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">Read-only — {users.length} most recent registered users.</p>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium text-ink-900">{u.name ?? "No name"}</p>
              <p className="truncate text-caption text-ink-500">{u.email ?? "No email"}</p>
            </div>
            <Badge variant={ROLE_VARIANT[u.role] ?? "neutral"}>{u.role}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
