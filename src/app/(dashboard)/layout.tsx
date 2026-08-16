import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { MockCashierAvailabilityProvider } from "@/lib/mock/cashier-availability";
import { MockCollateralProvider } from "@/lib/mock/collateral";
import { MockListingsProvider } from "@/lib/mock/listings";
import { MockOrdersProvider } from "@/lib/mock/orders";
import { MockPaymentMethodsProvider } from "@/lib/mock/payment-methods";
import { MockPixKeysProvider } from "@/lib/mock/pix-keys";
import { MockSessionProvider } from "@/lib/mock/session";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MockSessionProvider>
      <MockOrdersProvider>
        <MockPixKeysProvider>
          <MockCollateralProvider>
            <MockCashierAvailabilityProvider>
              <MockPaymentMethodsProvider>
                <MockListingsProvider>
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
                </MockListingsProvider>
              </MockPaymentMethodsProvider>
            </MockCashierAvailabilityProvider>
          </MockCollateralProvider>
        </MockPixKeysProvider>
      </MockOrdersProvider>
    </MockSessionProvider>
  );
}
