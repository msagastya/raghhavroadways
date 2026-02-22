"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useState } from "react"
import {
  LayoutDashboard,
  PackageSearch,
  Users,
  Building2,
  UserCheck,
  KeyRound,
  Truck,
  Receipt,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  UserCircle,
} from "lucide-react"

interface NavItem {
  label: string
  href?: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  children?: NavItem[]
  section?: string
}

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Consignments",
    href: "/consignments",
    icon: PackageSearch,
  },
  {
    label: "Parties",
    icon: Users,
    children: [
      { label: "Companies", href: "/parties/companies", icon: Building2 },
      { label: "Agents", href: "/parties/agents", icon: UserCheck },
      { label: "Vehicle Owners", href: "/parties/vehicle-owners", icon: KeyRound },
    ],
  },
  {
    label: "Vehicles",
    href: "/vehicles",
    icon: Truck,
  },
  {
    label: "Billing",
    icon: Receipt,
    children: [
      { label: "Invoices",          href: "/billing",                 icon: FileText },
      { label: "Vehicle Payments",  href: "/billing/vehicle-payments", icon: Truck },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

function NavItemComponent({
  item,
  depth = 0,
}: {
  item: NavItem
  depth?: number
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((c) => c.href && pathname.startsWith(c.href))
    }
    return false
  })

  const isActive = item.href ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)) : false

  const Icon = item.icon

  if (item.children) {
    const hasActiveChild = item.children.some(
      (c) => c.href && pathname.startsWith(c.href)
    )
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`sidebar-nav-item w-full ${hasActiveChild ? "text-white" : ""}`}
          style={{ paddingLeft: depth > 0 ? `${14 + depth * 16}px` : undefined }}
        >
          <Icon size={17} strokeWidth={1.8} />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown size={14} strokeWidth={2} className="opacity-60" />
          ) : (
            <ChevronRight size={14} strokeWidth={2} className="opacity-60" />
          )}
        </button>
        {open && (
          <div className="mt-0.5 ml-3 border-l border-white/10 pl-2">
            {item.children.map((child) => (
              <NavItemComponent key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={`sidebar-nav-item ${isActive ? "active" : ""}`}
      style={{ paddingLeft: depth > 0 ? `${14 + depth * 10}px` : undefined }}
    >
      <Icon size={17} strokeWidth={1.8} />
      <span>{item.label}</span>
    </Link>
  )
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()

  return (
    <div className="glass-dark flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="Raghhav Roadways"
              width={44}
              height={44}
              className="object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-[16px] leading-tight tracking-tight">
              Raghhav Roadways
            </p>
            <p className="text-[11.5px] font-semibold tracking-widest uppercase mt-0.5"
               style={{ color: "#C9A84C" }}>
              TMS
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigation.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl"
             style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
               style={{ background: "rgba(201,168,76,0.22)" }}>
            <UserCircle size={24} style={{ color: "#C9A84C" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[14px] font-semibold truncate leading-tight">
              {session?.user?.name ?? "User"}
            </p>
            <p className="text-[12px] truncate leading-tight mt-0.5"
               style={{ color: "rgba(255,255,255,0.50)" }}>
              {session?.user?.role ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-xl transition-colors hover:bg-white/12"
            title="Sign out"
          >
            <LogOut size={17} className="text-white/50 hover:text-white/85" />
          </button>
        </div>
      </div>
    </div>
  )
}
