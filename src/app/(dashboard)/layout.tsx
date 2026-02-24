"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"

const SIDEBAR_W = 280 // px

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()

  // Auto-close sidebar on navigation (mobile overlay mode)
  useEffect(() => { setOpen(false) }, [pathname])

  const showSidebar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setOpen(true)
  }, [])

  const hideSidebar = useCallback(() => {
    hideTimer.current = setTimeout(() => setOpen(false), 180)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Spacer — pushes content right on desktop only, never on mobile */}
      <div className="sidebar-spacer" data-open={String(open)} />

      {/* Hover trigger strip — desktop only */}
      <div
        className="fixed left-0 top-0 h-full z-40 hidden md:block"
        style={{ width: "14px" }}
        onMouseEnter={showSidebar}
      />

      {/* Mobile backdrop overlay — tap to close */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel — fixed, slides in from left */}
      <aside
        className="fixed left-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out"
        style={{
          width: `${SIDEBAR_W}px`,
          transform: open ? "translateX(0)" : `translateX(-${SIDEBAR_W}px)`,
        }}
        onMouseEnter={showSidebar}
        onMouseLeave={hideSidebar}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </aside>

      {/* Main content — fills remaining width, always full when sidebar closed */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ zIndex: 2 }}>
        <Header onMenuClick={() => setOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="page-content max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
