import { prisma } from "@/lib/prisma"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import { formatDate } from "@/lib/utils"
import { Users } from "lucide-react"
import AddUserForm from "@/components/settings/AddUserForm"
import UserRow from "@/components/settings/UserRow"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: { role: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle="Manage employee accounts and access levels"
        backHref="/settings"
        backLabel="Back to Settings"
      />

      {/* Add user */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-5">
          <Users size={15} strokeWidth={1.8} className="text-brand-900/50" />
          <span className="text-[13px] font-bold text-brand-900">Add New User</span>
        </div>
        <AddUserForm roles={roles} />
      </GlassCard>

      {/* Users list */}
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <span className="text-[13px] font-bold text-brand-900">
            All Users ({users.length})
          </span>
        </div>
        <div className="divide-y divide-brand-900/5">
          {users.map((user) => (
            <UserRow key={user.id} user={user} roles={roles} />
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
