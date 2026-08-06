import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-[calc(4rem+var(--spacing-safe-bottom))] md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
