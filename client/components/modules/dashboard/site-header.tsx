"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"

export function SiteHeader() {
  const section = usePathname().split("/").filter(Boolean)[1] ?? "Dashboard"
  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/85 backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-2"><h1 className="text-sm font-semibold capitalize">{section}</h1><Badge variant="outline" className="hidden text-[10px] sm:inline-flex">Workspace</Badge></div>
      </div>
    </header>
  )
}
