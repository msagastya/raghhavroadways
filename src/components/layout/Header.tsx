"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  Bell, Search, Menu, LogOut, X, CheckCheck,
  PackageSearch, Receipt, Truck, Users, LayoutDashboard, BarChart3, Settings,
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useState, useEffect, useRef, useTransition } from "react"
import { getNotifications, markAllNotificationsRead } from "@/actions/notifications"

const pageTitles: Record<string, string> = {
  "/dashboard":                "Dashboard",
  "/consignments":             "Consignments",
  "/parties/companies":        "Companies",
  "/parties/billing-parties":  "Billing Parties",
  "/parties/agents":           "Agents",
  "/parties/vehicle-owners":   "Vehicle Owners",
  "/vehicles":                 "Vehicles",
  "/billing/vehicle-payments": "Vehicle Payments",
  "/billing":                  "Billing",
  "/reports":                  "Reports",
  "/settings":                 "Settings",
  "/settings/users":           "Users & Roles",
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  const match = Object.keys(pageTitles)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key))
  return match ? pageTitles[match] : "Raghhav Roadways"
}

const SEARCH_TARGETS = [
  { label: "Dashboard",         href: "/dashboard",                 icon: LayoutDashboard, searchable: false },
  { label: "Consignments",      href: "/consignments",              icon: PackageSearch,   searchable: true  },
  { label: "Companies",         href: "/parties/companies",         icon: Users,           searchable: true  },
  { label: "Agents",            href: "/parties/agents",            icon: Users,           searchable: true  },
  { label: "Vehicle Owners",    href: "/parties/vehicle-owners",    icon: Users,           searchable: true  },
  { label: "Vehicles",          href: "/vehicles",                  icon: Truck,           searchable: true  },
  { label: "Billing / Invoices",href: "/billing",                   icon: Receipt,         searchable: true  },
  { label: "Vehicle Payments",  href: "/billing/vehicle-payments",  icon: Receipt,         searchable: true  },
  { label: "Reports",           href: "/reports",                   icon: BarChart3,       searchable: false },
  { label: "Settings",          href: "/settings",                  icon: Settings,        searchable: false },
]

type Notification = {
  id: string; type: string; title: string; message: string
  isRead: boolean; entityType: string | null; entityId: string | null; createdAt: Date
}

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { data: session } = useSession()
  const title = getPageTitle(pathname)
  const [isPending, startTransition] = useTransition()

  const [searchOpen,     setSearchOpen]     = useState(false)
  const [notifOpen,      setNotifOpen]      = useState(false)
  const [userOpen,       setUserOpen]       = useState(false)
  const [searchQuery,    setSearchQuery]    = useState("")
  const [notifications,  setNotifications]  = useState<Notification[]>([])
  const [notifsLoaded,   setNotifsLoaded]   = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)
  const userRef  = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  /* ── Load notifications when panel opens ── */
  function openNotifications() {
    setNotifOpen((v) => {
      const opening = !v
      if (opening && !notifsLoaded) {
        startTransition(async () => {
          const result = await getNotifications()
          if (result.success) {
            setNotifications(result.notifications as Notification[])
            setNotifsLoaded(true)
          }
        })
      }
      return opening
    })
    setUserOpen(false)
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    })
  }

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  /* ── Keyboard: Escape closes everything, ⌘K opens search ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false); setNotifOpen(false); setUserOpen(false)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  function navigate(href: string, searchable: boolean) {
    const q = searchQuery.trim()
    router.push(searchable && q ? `${href}?q=${encodeURIComponent(q)}` : href)
    setSearchOpen(false)
    setSearchQuery("")
  }

  const filtered = SEARCH_TARGETS.filter((t) =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === ""
  )

  return (
    <>
      {/* ── Header bar ── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-4 px-4 md:px-8 py-3 md:py-4"
        style={{
          background:         "transparent",
          backdropFilter:     "blur(22px) saturate(155%) brightness(1.04)",
          WebkitBackdropFilter: "blur(22px) saturate(155%) brightness(1.04)",
          borderBottom:       "1.5px solid rgba(255,255,255,0.30)",
          boxShadow:          "0 4px 24px rgba(0,0,0,0.12), inset 0 -1px 0 rgba(255,255,255,0.20)",
        }}
      >
        {/* Sidebar toggle */}
        <button
          onClick={onMenuClick}
          className="p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-brand-900/8 transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={20} className="text-brand-900" />
        </button>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-brand-900 truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2">

          {/* ── Global Search ── */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-brand-900/6"
            title="Search (⌘K)"
          >
            <Search size={16} strokeWidth={1.8} className="text-brand-900/60" />
            <span className="hidden md:block text-[13px] text-brand-900/40 font-medium">⌘K</span>
          </button>

          {/* ── Notifications ── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={openNotifications}
              className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-brand-900/6 transition-colors"
              title="Notifications"
            >
              <Bell size={18} strokeWidth={1.8} className="text-brand-900/60" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center px-0.5">
                  <span className="text-[9px] font-bold text-white leading-none">{unreadCount > 9 ? "9+" : unreadCount}</span>
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl z-50 overflow-hidden"
                style={{
                  background:    "rgba(255,255,255,0.92)",
                  backdropFilter:"blur(48px) saturate(160%)",
                  border:        "1px solid rgba(255,255,255,0.70)",
                  boxShadow:     "0 20px 60px rgba(13,43,26,0.14), 0 4px 16px rgba(13,43,26,0.08)",
                }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/6">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-brand-900">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                        className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 transition-colors flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="text-brand-900/30 hover:text-brand-900/60 transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {isPending && !notifsLoaded ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                           style={{ background: "rgba(13,43,26,0.06)" }}>
                        <Bell size={20} strokeWidth={1.4} className="text-brand-900/30" />
                      </div>
                      <p className="text-[13px] font-semibold text-brand-900/50">No notifications</p>
                      <p className="text-[12px] text-brand-900/30 mt-1">You're all caught up</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-black/4 last:border-0 transition-colors ${
                          !n.isRead ? "bg-brand-50/60" : "hover:bg-brand-900/3"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && (
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                          )}
                          <div className={!n.isRead ? "" : "pl-3.5"}>
                            <p className="text-[13px] font-semibold text-brand-900 leading-tight">{n.title}</p>
                            <p className="text-[12px] text-brand-900/55 mt-0.5 leading-snug">{n.message}</p>
                            <p className="text-[10px] text-brand-900/30 mt-1">
                              {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-brand-900/10 mx-1" />

          {/* ── User chip / dropdown ── */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => { setUserOpen((v) => !v); setNotifOpen(false) }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors hover:bg-brand-900/6"
              style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.08)" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: "#0D2B1A" }}
              >
                {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-[13px] font-medium text-brand-900 hidden sm:block">
                {session?.user?.name?.split(" ")[0] ?? "User"}
              </span>
            </button>

            {userOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-[min(240px,calc(100vw-2rem))] rounded-2xl z-50 overflow-hidden"
                style={{
                  background:    "rgba(255,255,255,0.92)",
                  backdropFilter:"blur(48px) saturate(160%)",
                  border:        "1px solid rgba(255,255,255,0.70)",
                  boxShadow:     "0 20px 60px rgba(13,43,26,0.14), 0 4px 16px rgba(13,43,26,0.08)",
                }}
              >
                {/* User info */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-black/6">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold text-white shrink-0"
                    style={{ background: "linear-gradient(135deg, #348438 0%, #0D2B1A 100%)" }}
                  >
                    {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-brand-900 truncate">
                      {session?.user?.name ?? "User"}
                    </p>
                    <p className="text-[12px] text-brand-900/45 truncate capitalize">
                      {session?.user?.role?.toLowerCase() ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Sign out */}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} strokeWidth={2} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Global Search Modal ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4"
          style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)" }}
          onClick={() => { setSearchOpen(false); setSearchQuery("") }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden animate-fade-up"
            style={{
              background:    "rgba(255,255,255,0.94)",
              backdropFilter:"blur(60px) saturate(180%)",
              border:        "1px solid rgba(255,255,255,0.80)",
              boxShadow:     "0 32px 80px rgba(13,43,26,0.22), 0 8px 24px rgba(13,43,26,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/6">
              <Search size={16} strokeWidth={2} className="text-brand-900/40 shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search across TMS..."
                className="flex-1 bg-transparent outline-none text-[15px] font-medium text-brand-900 placeholder:text-brand-900/30"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery("") }}
                className="text-brand-900/30 hover:text-brand-900/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            <div className="p-2 max-h-80 overflow-y-auto">
              {searchQuery && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-900/30 px-3 pt-2 pb-1">
                  Search in
                </p>
              )}
              {!searchQuery && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-900/30 px-3 pt-2 pb-1">
                  Quick navigate
                </p>
              )}
              {filtered.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.href}
                    onClick={() => navigate(t.href, t.searchable)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                         style={{ background: "rgba(13,43,26,0.07)" }}>
                      <Icon size={15} strokeWidth={1.8} className="text-brand-700" />
                    </div>
                    <span className="flex-1 text-[14px] font-medium text-brand-900">{t.label}</span>
                    {searchQuery && t.searchable && (
                      <span className="text-[11px] text-brand-900/35 font-medium hidden group-hover:block">
                        for &quot;{searchQuery}&quot;
                      </span>
                    )}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-center text-[13px] text-brand-900/35 py-8">No results for &quot;{searchQuery}&quot;</p>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-black/5 flex items-center gap-4">
              <span className="text-[11px] text-brand-900/30">Press <kbd className="font-mono bg-brand-900/6 px-1.5 py-0.5 rounded text-[10px]">↵</kbd> to navigate</span>
              <span className="text-[11px] text-brand-900/30"><kbd className="font-mono bg-brand-900/6 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
