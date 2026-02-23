import { prisma } from "@/lib/prisma"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import CompanySettingsForm from "@/components/settings/CompanySettingsForm"
import NumberingSettingsForm from "@/components/settings/NumberingSettingsForm"
import ChangePasswordForm from "@/components/settings/ChangePasswordForm"
import { Building2, Hash, Users, Lock } from "lucide-react"
import Link from "next/link"

export const revalidate = 300

export default async function SettingsPage() {
  const settings = await prisma.systemSetting.findMany()
  const S: Record<string, string> = {}
  settings.forEach((s) => { S[s.key] = s.value })

  const INDIAN_STATES = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
    "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
    "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
    "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
    "Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir",
    "Ladakh","Lakshadweep","Puducherry",
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Company details, billing config, and preferences"
      />

      {/* Company Details */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={15} strokeWidth={1.8} className="text-brand-900/50" />
          <span className="text-[13px] font-bold text-brand-900">Company Details</span>
        </div>
        <CompanySettingsForm settings={S} states={INDIAN_STATES} />
      </GlassCard>

      {/* Numbering */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-5">
          <Hash size={15} strokeWidth={1.8} className="text-brand-900/50" />
          <span className="text-[13px] font-bold text-brand-900">GR & Invoice Numbering</span>
        </div>
        <NumberingSettingsForm settings={S} />
        <p className="text-[11.5px] text-brand-900/40 mt-4 leading-relaxed">
          GR numbers generate as: <span className="font-mono font-semibold">{S["lr_prefix"] || "GR"}0001</span>.
          {" "}Invoice numbers generate as: <span className="font-mono font-semibold">{S["invoice_prefix"] || "RR"}/{S["invoice_series"] || "2025-26"}/0001</span>.
          {" "}Change prefix/series here — the counter increments automatically.
        </p>
      </GlassCard>

      {/* Change Password */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-5">
          <Lock size={15} strokeWidth={1.8} className="text-brand-900/50" />
          <span className="text-[13px] font-bold text-brand-900">Change My Password</span>
        </div>
        <ChangePasswordForm />
      </GlassCard>

      {/* Users link */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <div>
              <p className="text-[13px] font-bold text-brand-900">Users & Roles</p>
              <p className="text-[12px] text-brand-900/45 mt-0.5">
                Manage employee accounts and access levels
              </p>
            </div>
          </div>
          <Link href="/settings/users" className="btn-outline text-[13px]"
                style={{ padding: "7px 16px" }}>
            Manage Users
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}
