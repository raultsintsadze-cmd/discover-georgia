import { BottomNav } from "@/components/shell/BottomNav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <main className="pb-nav">{children}</main>
      <BottomNav />
    </div>
  );
}
