"use client"

import { useState, useTransition } from "react"
import { createUser } from "@/actions/settings"
import toast from "react-hot-toast"
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react"

interface Role { id: string; name: string }

function F({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function AddUserForm({ roles }: { roles: Role[] }) {
  const [isPending, start] = useTransition()
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", roleId: "",
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name)     { toast.error("Enter name"); return }
    if (!form.email)    { toast.error("Enter email"); return }
    if (!form.password || form.password.length < 8) {
      toast.error("Password must be at least 8 characters"); return
    }
    if (!form.roleId)   { toast.error("Select a role"); return }

    start(async () => {
      const r = await createUser({
        name:     form.name,
        email:    form.email,
        password: form.password,
        phone:    form.phone || null,
        roleId:   form.roleId,
      })
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("User created successfully!")
      setForm({ name: "", email: "", password: "", phone: "", roleId: "" })
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <F label="Full Name" required>
          <input type="text" className="input-field" placeholder="e.g. Ravi Kumar"
                 value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </F>
        <F label="Email" required>
          <input type="email" className="input-field" placeholder="ravi@raghhav.com"
                 value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </F>
        <F label="Phone">
          <input type="tel" className="input-field" placeholder="+91 98765 43210"
                 value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </F>
        <F label="Password" required>
          <div className="relative">
            <input type={showPwd ? "text" : "password"} className="input-field pr-10"
                   placeholder="Min 8 characters"
                   value={form.password} onChange={(e) => set("password", e.target.value)} required />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-900/40 hover:text-brand-900/70">
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </F>
        <F label="Role" required>
          <select className="input-field bg-white" value={form.roleId}
                  onChange={(e) => set("roleId", e.target.value)} required>
            <option value="">Select role...</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </F>
      </div>
      <div className="flex justify-end mt-4">
        <button type="submit" className="btn-primary text-[13px]"
                style={{ padding: "9px 20px" }} disabled={isPending}>
          {isPending
            ? <><Loader2 size={14} className="animate-spin" /> Creating...</>
            : <><UserPlus size={14} /> Add User</>}
        </button>
      </div>
    </form>
  )
}
