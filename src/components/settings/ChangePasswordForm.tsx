"use client"

import { useState, useTransition } from "react"
import { changeOwnPassword } from "@/actions/settings"
import toast from "react-hot-toast"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"

function PasswordInput({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-field pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-900/35 hover:text-brand-900/60 transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePasswordForm() {
  const [isPending, start] = useTransition()
  const [form, setForm]    = useState({ current: "", next: "", confirm: "" })

  function set(k: keyof typeof form, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.current) { toast.error("Enter your current password"); return }
    if (form.next.length < 8) { toast.error("New password must be at least 8 characters"); return }
    if (form.next !== form.confirm) { toast.error("New passwords do not match"); return }

    start(async () => {
      const r = await changeOwnPassword(form.current, form.next)
      if (!r.success) { toast.error(r.error ?? "Failed to change password"); return }
      toast.success("Password changed successfully")
      setForm({ current: "", next: "", confirm: "" })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput
        label="Current Password"
        value={form.current}
        onChange={(v) => set("current", v)}
        placeholder="Your current password"
      />
      <PasswordInput
        label="New Password"
        value={form.next}
        onChange={(v) => set("next", v)}
        placeholder="At least 8 characters"
      />
      <PasswordInput
        label="Confirm New Password"
        value={form.confirm}
        onChange={(v) => set("confirm", v)}
        placeholder="Repeat new password"
      />
      <div className="flex justify-end pt-1">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
          {isPending ? "Changing..." : "Change Password"}
        </button>
      </div>
    </form>
  )
}
