"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  page:     number
  total:    number
  pageSize: number
}

export default function Pagination({ page, total, pageSize }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [, start] = useTransition()

  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  function goTo(p: number) {
    const sp = new URLSearchParams(params.toString())
    if (p === 1) sp.delete("page")
    else sp.set("page", String(p))
    start(() => router.push(`${pathname}?${sp.toString()}`))
  }

  // Show window of page numbers around current page
  const WINDOW = 2
  const pages: (number | "...")[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - WINDOW && i <= page + WINDOW)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...")
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-brand-900/5">
      <p className="text-[12px] text-brand-900/40 font-medium hidden sm:block">
        Showing {from}–{to} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-brand-900/60 hover:bg-brand-900/6 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[12px] text-brand-900/30">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p as number)}
              className={`w-9 h-9 md:w-8 md:h-7 rounded-lg text-[12px] font-semibold transition-colors ${
                p === page
                  ? "bg-brand-900 text-white"
                  : "text-brand-900/60 hover:bg-brand-900/6"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-brand-900/60 hover:bg-brand-900/6 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
