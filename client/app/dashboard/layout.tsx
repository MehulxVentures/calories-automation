import { requireSession } from '@/utils';

import { AppSidebar } from "@/components/modules/dashboard/app-sidebar"
import { SiteHeader } from "@/components/modules/dashboard/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
     await requireSession();
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset className="h-svh overflow-hidden">
                <SiteHeader />
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
                        <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <div className="min-h-0 flex-1">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default DashboardLayout;
