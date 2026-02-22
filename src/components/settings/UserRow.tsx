"use client"

import { useState, useTransition } from "react"
import { updateUser, toggleUserActive, changePassword } from "@/actions/settings"
import toast from "react-hot-toast"
import { Loader2, Pencil, Check, X, KeyRound, Eye, EyeOff } from "lucide-react"

interface Role { id: string; name: string }
interface User {
  id: string; name: string; email: string; phone: string | null
  isActive: boolean; createdAt: Date
  role: { id: string; name: string }
}

export default function UserRow({ user, roles }: { user: User; roles: Role[] }) {
  const [isPending, start]     = useTransition()
  const [editing, setEditing]  = useState(false)
  const [pwdMode, setPwdMode]  = useState(false)
  const [showPwd, setShowPwd]  = useState(false)
  const [newPwd, setNewPwd]    = useState("")

  const [form, setForm] = useState({
    name:     user.name,
    phone:    user.phone ?? "",
    roleId:   user.role.id,
    isActive: user.isActive,
  })

  function set(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSave() {
    start(async () => {
      const r = await updateUser(user.id, {
        name:     form.name,
        phone:    form.phone || null,
        roleId:   form.roleId,
        isActive: form.isActive,
      })
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("User updated!")
      setEditing(false)
    })
  }

  function handleToggle() {
    start(async () => {
      const r = await toggleUserActive(user.id, !user.isActive)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success(user.isActive ? "User deactivated" : "User activated")
    })
  }

  function handlePasswordChange() {
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return }
    start(async () => {
      const r = await changePassword(user.id, newPwd)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Password changed!")
      setPwdMode(false)
      setNewPwd("")
    })
  }

  return (
    <div className="px-5 py-4">
      {editing ? (
        // Edit mode
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Name</label>
              <input type="text" className="input-field text-[13px]"
                     value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Phone</label>
              <input type="tel" className="input-field text-[13px]"
                     value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Role</label>
              <select className="input-field bg-white text-[13px]"
                      value={form.roleId} onChange={(e) => set("roleId", e.target.value)}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={isPending}
                    className="btn-primary text-[12px]" style={{ padding: "6px 14px" }}>
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
            </button>
            <button onClick={() => setEditing(false)} className="btn-outline text-[12px]"
                    style={{ padding: "6px 14px" }}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : pwdMode ? (
        // Password change mode
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <input type={showPwd ? "text" : "password"} className="input-field text-[13px] pr-10"
                   placeholder="New password (min 8 chars)"
                   value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-900/40">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button onClick={handlePasswordChange} disabled={isPending}
                  className="btn-primary text-[12px]" style={{ padding: "6px 14px" }}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Set Password
          </button>
          <button onClick={() => { setPwdMode(false); setNewPwd("") }}
                  className="btn-outline text-[12px]" style={{ padding: "6px 14px" }}>
            <X size={13} /> Cancel
          </button>
        </div>
      ) : (
        // View mode
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
               style={{ background: user.isActive ? "#0D2B1A" : "#9ca3af" }}>
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13.5px] font-semibold text-brand-900">{user.name}</p>
              {!user.isActive && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-[12px] text-brand-900/45 mt-0.5">{user.email}
              {user.phone ? ` · ${user.phone}` : ""}
            </p>
          </div>
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: "rgba(13,43,26,0.07)", color: "#0D2B1A" }}>
            {user.role.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)} title="Edit user"
                    className="p-2 rounded-lg hover:bg-brand-900/5 transition-colors text-brand-900/50 hover:text-brand-900">
              <Pencil size={14} />
            </button>
            <button onClick={() => setPwdMode(true)} title="Change password"
                    className="p-2 rounded-lg hover:bg-brand-900/5 transition-colors text-brand-900/50 hover:text-brand-900">
              <KeyRound size={14} />
            </button>
            <button onClick={handleToggle} disabled={isPending} title={user.isActive ? "Deactivate" : "Activate"}
                    className={`p-2 rounded-lg transition-colors text-[12px] font-semibold ${
                      user.isActive
                        ? "hover:bg-red-50 text-red-400 hover:text-red-600"
                        : "hover:bg-green-50 text-green-500 hover:text-green-700"
                    }`}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : user.isActive ? <X size={14} /> : <Check size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
