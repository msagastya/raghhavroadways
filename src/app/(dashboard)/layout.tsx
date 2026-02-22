"use client"

import { useState, useRef, useCallback } from "react"
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

  const showSidebar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setOpen(true)
  }, [])

  const hideSidebar = useCallback(() => {
    hideTimer.current = setTimeout(() => setOpen(false), 180)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Spacer — grows to push main content right when sidebar opens */}
      <div
        className="flex-shrink-0 transition-[width] duration-300 ease-in-out"
        style={{ width: open ? `${SIDEBAR_W}px` : "0px" }}
      />

      {/* Hover trigger strip — left edge of viewport */}
      <div
        className="fixed left-0 top-0 h-full z-40"
        style={{ width: "14px" }}
        onMouseEnter={showSidebar}
      />

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
        <main className="flex-1 overflow-y-auto p-8 md:p-10">
          <div className="page-content max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
