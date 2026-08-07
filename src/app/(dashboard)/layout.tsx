import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatProvider } from "@/lib/mock/chat";
import { MockOrdersProvider } from "@/lib/mock/orders";
import { MockSessionProvider } from "@/lib/mock/session";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MockSessionProvider>
      <MockOrdersProvider>
        <ChatProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileHeader />
              <main className="flex-1 pb-[calc(4rem+var(--spacing-safe-bottom))] md:pb-0">
                {children}
              </main>
            </div>
            <BottomNav />
          </div>
        </ChatProvider>
      </MockOrdersProvider>
    </MockSessionProvider>
  );
}
