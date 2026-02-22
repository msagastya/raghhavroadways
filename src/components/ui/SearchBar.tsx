"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { useTransition, useState, useEffect } from "react"

export default function SearchBar({ placeholder = "Search..." }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    setValue(searchParams.get("q") ?? "")
  }, [searchParams])

  function handleChange(v: string) {
    setValue(v)
    const params = new URLSearchParams(searchParams.toString())
    if (v) {
      params.set("q", v)
    } else {
      params.delete("q")
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search
        size={15}
        strokeWidth={2}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-900/35 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        style={{ paddingTop: "9px", paddingBottom: "9px", paddingLeft: "2.25rem", paddingRight: "2rem" }}
      />
      {value && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-900/30 hover:text-brand-900/60 transition-colors"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
